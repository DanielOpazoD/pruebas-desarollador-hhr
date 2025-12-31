/**
 * Audit Service
 * Provides audit logging functionality for critical patient actions.
 * Stores logs in Firestore for compliance and traceability.
 */

import {
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    orderBy,
    limit,
    Timestamp,
    where
} from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { AuditLogEntry, AuditAction, maskRut } from '../../types/audit';
import {
    saveAuditLog,
    getAuditLogs as getIndexedDBAuditLogs,
    getAuditLogsForDate as getIndexedDBAuditLogsForDate
} from '../storage/indexedDBService';

// ============================================================================
// User Identification (Improved)
// ============================================================================

const USER_EMAIL_CACHE_KEY = 'hhr_audit_user_email_cache';

/**
 * Get current user email with robust fallbacks
 * Priority: auth.email → cached email → displayName → uid → anonymous
 */
const getCurrentUserEmail = (): string => {
    // Primary: Firebase Auth email
    if (auth.currentUser?.email) {
        // Cache it for future fallback
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(USER_EMAIL_CACHE_KEY, auth.currentUser.email);
        }
        return auth.currentUser.email;
    }

    // Fallback: Cached email from last successful auth
    if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(USER_EMAIL_CACHE_KEY);
        if (cached) return cached;
    }

    // Fallback: displayName or UID
    if (auth.currentUser?.displayName) return auth.currentUser.displayName;
    if (auth.currentUser?.uid) return `uid:${auth.currentUser.uid.slice(0, 8)}...`;

    return 'anonymous';
};

/**
 * Get user display name if available
 */
const getCurrentUserDisplayName = (): string | undefined => {
    return auth.currentUser?.displayName || undefined;
};

/**
 * Get Firebase UID
 */
const getCurrentUserUid = (): string | undefined => {
    return auth.currentUser?.uid || undefined;
};

// ============================================================================
// IP Address Tracking
// ============================================================================

const IP_CACHE_KEY = 'hhr_audit_user_ip';
let ipFetchInProgress = false;

/**
 * Get user's IP address (cached in session)
 * Non-blocking - returns cached value or undefined
 */
const getCachedIpAddress = (): string | undefined => {
    if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(IP_CACHE_KEY) || undefined;
    }
    return undefined;
};

/**
 * Fetch and cache user's IP address (call once at login)
 */
export const fetchAndCacheIpAddress = async (): Promise<string | undefined> => {
    if (ipFetchInProgress) return getCachedIpAddress();

    try {
        ipFetchInProgress = true;
        const response = await fetch('https://api.ipify.org?format=json', {
            signal: AbortSignal.timeout(3000) // 3s timeout
        });
        const data = await response.json();
        const ip = data.ip as string;

        if (typeof sessionStorage !== 'undefined' && ip) {
            sessionStorage.setItem(IP_CACHE_KEY, ip);
        }
        return ip;
    } catch (error) {
        console.warn('[Audit] Could not fetch IP address:', error);
        return undefined;
    } finally {
        ipFetchInProgress = false;
    }
};

// ============================================================================
// Summary Generation
// ============================================================================

/**
 * Generate human-readable summary for audit entry
 */
const generateSummary = (
    action: AuditAction,
    details: Record<string, unknown>,
    entityId: string
): string => {
    const patientName = (details.patientName as string) || 'Paciente';
    const bedId = (details.bedId as string) || entityId;

    switch (action) {
        case 'PATIENT_ADMITTED':
            const dx = (details.pathology as string) ? ` [Dx: ${details.pathology}]` : '';
            return `Ingreso: ${patientName}${dx} → Cama ${bedId}`;
        case 'PATIENT_DISCHARGED':
            return `Alta: ${patientName} (${(details.status as string) || 'Egreso'})`;
        case 'PATIENT_TRANSFERRED':
            return `Traslado: ${patientName} → ${(details.destination as string) || 'otro centro'}`;
        case 'PATIENT_MODIFIED':
            return `Datos actualizados: ${patientName}`;
        case 'PATIENT_CLEARED':
            return `Cama liberada: ${bedId}`;
        case 'DAILY_RECORD_CREATED':
            return `Registro creado: ${entityId}${details.copiedFrom ? ` (copiado de ${details.copiedFrom})` : ''}`;
        case 'DAILY_RECORD_DELETED':
            return `Registro eliminado: ${entityId}`;
        case 'CUDYR_MODIFIED':
            return `CUDYR modificado: ${patientName}`;
        case 'NURSE_HANDOFF_MODIFIED':
            return `Nota enfermería (${(details.shift as string) === 'day' ? 'Día' : 'Noche'})`;
        case 'MEDICAL_HANDOFF_MODIFIED':
            return `Evolución médica actualizada`;
        case 'HANDOFF_NOVEDADES_MODIFIED':
            return `Novedades actualizadas (${(details.shift as string) || 'turno'})`;
        case 'VIEW_CUDYR':
            return `Vista: Planilla CUDYR`;
        case 'VIEW_NURSING_HANDOFF':
            return `Vista: Entrega Enfermería`;
        case 'VIEW_MEDICAL_HANDOFF':
            return `Vista: Entrega Médica`;
        case 'USER_LOGIN':
            return `Inicio de sesión`;
        case 'USER_LOGOUT':
            return `Cierre de sesión${details.durationFormatted ? ` (${details.durationFormatted})` : ''}`;
        case 'PATIENT_VIEWED':
            return `Ficha visualizada: ${patientName}`;
        case 'BED_BLOCKED':
            return `Cama bloqueada: ${bedId}${details.reason ? ` (${details.reason})` : ''}`;
        case 'BED_UNBLOCKED':
            return `Cama desbloqueada: ${bedId}`;
        case 'EXTRA_BED_TOGGLED':
            return `${details.active ? 'Activada' : 'Desactivada'} cama extra: ${bedId}`;
        case 'MEDICAL_HANDOFF_SIGNED':
            return `Entrega médica firmada: ${(details.doctorName as string) || 'Médico'}`;
        default:
            return action;
    }
};

const HOSPITAL_ID = 'hanga_roa';
const COLLECTION_NAME = 'auditLogs';

// Local storage key for offline fallback (Legacy, used for migration)
const AUDIT_STORAGE_KEY = 'hanga_roa_audit_logs';

/**
 * Users excluded from VIEW auditing (to reduce unnecessary data storage).
 * These users will still be audited for critical actions (admissions, discharges, transfers).
 */
const EXCLUDED_VIEW_AUDIT_EMAILS: string[] = [
    'daniel.opazo@hospitalhangaroa.cl',
    'hospitalizados@hospitalhangaroa.cl'
];

/**
 * Check if the current user should be excluded from view auditing.
 * Only applies to visualization logs, NOT to critical patient actions.
 */
const shouldExcludeFromViewAudit = (): boolean => {
    const email = getCurrentUserEmail();
    return EXCLUDED_VIEW_AUDIT_EMAILS.includes(email);
};

// ============================================================================
// View Throttling (15 minute window)
// ============================================================================

const VIEW_THROTTLE_KEY = 'hhr_audit_view_throttle';
const VIEW_THROTTLE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface ViewThrottleState {
    [action: string]: string; // action -> last logged ISO timestamp
}

/**
 * Get the current throttle state from sessionStorage
 */
const getViewThrottleState = (): ViewThrottleState => {
    if (typeof sessionStorage === 'undefined') return {};
    try {
        const data = sessionStorage.getItem(VIEW_THROTTLE_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
};

/**
 * Update throttle state for an action
 */
const updateViewThrottleState = (action: string): void => {
    if (typeof sessionStorage === 'undefined') return;
    const state = getViewThrottleState();
    state[action] = new Date().toISOString();
    sessionStorage.setItem(VIEW_THROTTLE_KEY, JSON.stringify(state));
};

/**
 * Check if a view action should be logged (throttle check)
 * Returns true if enough time has passed since last log of this type
 */
const shouldLogViewAction = (action: AuditAction): boolean => {
    // Only throttle VIEW_* actions
    if (!action.startsWith('VIEW_')) return true;

    const state = getViewThrottleState();
    const lastLogged = state[action];

    if (!lastLogged) return true; // Never logged before

    const elapsed = Date.now() - new Date(lastLogged).getTime();
    return elapsed >= VIEW_THROTTLE_WINDOW_MS;
};

/**
 * Log a view event with throttling
 * Only logs if >15 minutes have passed since last similar view
 */
export const logThrottledViewEvent = async (
    action: AuditAction,
    entityId: string,
    details: Record<string, unknown>,
    recordDate?: string
): Promise<void> => {
    // Check user exclusion
    if (shouldExcludeFromViewAudit()) return;

    // Check throttle
    if (!shouldLogViewAction(action)) {
        console.log(`📋 View log throttled: ${action} (logged within last 15 min)`);
        return;
    }

    // Update throttle state
    updateViewThrottleState(action);

    // Log the event
    await logAuditEvent(
        getCurrentUserEmail(),
        action,
        'patient',
        entityId,
        details,
        undefined,
        recordDate
    );
};

// Get collection reference
const getAuditCollection = () => collection(db, 'hospitals', HOSPITAL_ID, COLLECTION_NAME);

/**
 * Generate a unique ID for audit entries
 */
const generateAuditId = (): string => {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Store audit log entry locally (fallback)
 */
const storeLocally = async (entry: AuditLogEntry): Promise<void> => {
    try {
        await saveAuditLog(entry);
    } catch (error) {
        console.error('Failed to store audit log in IndexedDB:', error);
    }
};

/**
 * Get locally stored audit logs
 */
export const getLocalAuditLogs = async (): Promise<AuditLogEntry[]> => {
    try {
        return await getIndexedDBAuditLogs(1000);
    } catch {
        return [];
    }
};

/**
 * Log an audit event
 * Stores in Firestore with localStorage fallback
 */
export const logAuditEvent = async (
    userId: string,
    action: AuditAction,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details: Record<string, unknown>,
    patientRut?: string,
    recordDate?: string,
    authors?: string
): Promise<void> => {
    // Area 7: Prevent duplicate view logs (Throttling)
    if (action.startsWith('VIEW_') && !shouldLogViewAction(action)) {
        // console.log(`📋 Audit VIEW throttled: ${action}`);
        return;
    }

    // Update throttle state for view actions
    if (action.startsWith('VIEW_')) {
        updateViewThrottleState(action);
    }

    const entry: AuditLogEntry = {
        id: generateAuditId(),
        timestamp: new Date().toISOString(),

        // User identification (improved)
        userId,
        userDisplayName: getCurrentUserDisplayName(),
        userUid: getCurrentUserUid(),
        ipAddress: getCachedIpAddress(),

        // Action
        action,
        entityType,
        entityId,

        // Human-readable summary
        summary: generateSummary(action, details, entityId),

        // Technical details
        details: {
            ...details,
            _metadata: {
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
                platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
            }
        },
        patientIdentifier: patientRut ? maskRut(patientRut) : undefined,
        recordDate,
        authors
    };

    // Always store locally first (immediate)
    storeLocally(entry);

    // Then try to store in Firestore
    try {
        const docRef = doc(getAuditCollection(), entry.id);
        await setDoc(docRef, {
            ...entry,
            timestamp: Timestamp.now()
        });
        console.log('📋 Audit log saved:', action, entityId);
    } catch (error) {
        console.error('Failed to save audit log to Firestore:', error);
        // Entry is already stored locally as fallback
    }
};

/**
 * Get recent audit logs from Firestore
 */
export const getAuditLogs = async (limitCount: number = 100): Promise<AuditLogEntry[]> => {
    try {
        const q = query(
            getAuditCollection(),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp instanceof Timestamp
                    ? data.timestamp.toDate().toISOString()
                    : data.timestamp
            } as AuditLogEntry;
        });
    } catch (error) {
        console.error('Failed to fetch audit logs from Firestore:', error);
        // Return local logs as fallback
        return await getLocalAuditLogs();
    }
};

/**
 * Get audit logs for a specific date
 */
export const getAuditLogsForDate = async (date: string): Promise<AuditLogEntry[]> => {
    try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            getAuditCollection(),
            where('recordDate', '==', date),
            orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp instanceof Timestamp
                    ? data.timestamp.toDate().toISOString()
                    : data.timestamp
            } as AuditLogEntry;
        });
    } catch (error) {
        console.error('Failed to fetch audit logs for date:', error);
        // Fallback to IndexedDB
        return await getIndexedDBAuditLogsForDate(date);
    }
};

// Action label translations for UI
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
    'PATIENT_ADMITTED': 'Ingreso de Paciente',
    'PATIENT_DISCHARGED': 'Alta de Paciente',
    'PATIENT_TRANSFERRED': 'Traslado de Paciente',
    'PATIENT_MODIFIED': 'Modificación de Datos',
    'PATIENT_CLEARED': 'Limpieza de Cama',
    'DAILY_RECORD_DELETED': 'Eliminación de Registro',
    'DAILY_RECORD_CREATED': 'Creación de Registro',
    'PATIENT_VIEWED': 'Visualización de Ficha',
    'NURSE_HANDOFF_MODIFIED': 'Nota Enfermería (Entrega)',
    'MEDICAL_HANDOFF_MODIFIED': 'Nota Médica (Entrega)',
    'HANDOFF_NOVEDADES_MODIFIED': 'Cambio en Novedades',
    'CUDYR_MODIFIED': 'Evaluación CUDYR',
    'USER_LOGIN': 'Inicio de Sesión',
    'USER_LOGOUT': 'Cierre de Sesión',
    'BED_BLOCKED': 'Cama Bloqueada',
    'BED_UNBLOCKED': 'Cama Desbloqueada',
    'EXTRA_BED_TOGGLED': 'Cama Extra Toggled',
    'MEDICAL_HANDOFF_SIGNED': 'Firma Entrega Médica',
    'VIEW_CUDYR': 'Visualización CUDYR',
    'VIEW_NURSING_HANDOFF': 'Visualización Entrega Enfermería',
    'VIEW_MEDICAL_HANDOFF': 'Visualización Entrega Médica'
};

// ============================================================================
// Simple Logging Functions (auto-detect user)
// These can be called directly from hooks without passing userId
// ============================================================================

/**
 * Log patient admission (when patientName is set on empty bed)
 */
export const logPatientAdmission = (bedId: string, patientName: string, rut: string, pathology: string, recordDate: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'PATIENT_ADMITTED', 'patient', bedId, { patientName, bedId, pathology, rut }, rut, recordDate);
};

/**
 * Log patient discharge
 */
export const logPatientDischarge = (bedId: string, patientName: string, rut: string, status: string, recordDate: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'PATIENT_DISCHARGED', 'discharge', bedId, { patientName, status, bedId, rut }, rut, recordDate);
};

/**
 * Log patient transfer
 */
export const logPatientTransfer = (bedId: string, patientName: string, rut: string, destination: string, recordDate: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'PATIENT_TRANSFERRED', 'transfer', bedId, { patientName, destination, bedId, rut }, rut, recordDate);
};

/**
 * Log patient data cleared from bed
 */
export const logPatientCleared = (bedId: string, patientName: string, rut: string, recordDate: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'PATIENT_CLEARED', 'patient', bedId, { patientName, bedId }, rut, recordDate);
};

/**
 * Log daily record deletion
 */
export const logDailyRecordDeleted = (date: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'DAILY_RECORD_DELETED', 'dailyRecord', date, { date }, undefined, date);
};

/**
 * Log daily record creation
 */
export const logDailyRecordCreated = (date: string, copiedFrom?: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'DAILY_RECORD_CREATED', 'dailyRecord', date, { date, copiedFrom }, undefined, date);
};

/**
 * Log patient record view (for legal traceability)
 * Excluded for admin/nursing users to reduce data storage
 */
export const logPatientView = (bedId: string, patientName: string, rut: string, recordDate: string): Promise<void> => {
    // Skip logging for excluded users (admin/nursing)
    if (shouldExcludeFromViewAudit()) {
        return Promise.resolve();
    }
    return logAuditEvent(getCurrentUserEmail(), 'PATIENT_VIEWED', 'patient', bedId, { patientName, bedId }, rut, recordDate);
};

/**
 * Log modification of nursing handoff note
 */
export const logNurseHandoffModified = (bedId: string, patientName: string, rut: string, shift: string, note: string, oldNote: string, recordDate: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'NURSE_HANDOFF_MODIFIED', 'patient', bedId, {
        patientName,
        bedId,
        rut,
        shift,
        note,
        changes: {
            note: { old: oldNote, new: note }
        }
    }, rut, recordDate);
};

/**
 * Log modification of medical handoff note
 */
export const logMedicalHandoffModified = (bedId: string, patientName: string, rut: string, note: string, oldNote: string, recordDate: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'MEDICAL_HANDOFF_MODIFIED', 'patient', bedId, {
        patientName,
        bedId,
        rut,
        note,
        changes: {
            note: { old: oldNote, new: note }
        }
    }, rut, recordDate);
};

/**
 * Log modification of general handoff novedades
 */
export const logHandoffNovedadesModified = (shift: string, content: string, oldContent: string, recordDate: string): Promise<void> => {
    return logAuditEvent(getCurrentUserEmail(), 'HANDOFF_NOVEDADES_MODIFIED', 'dailyRecord', recordDate, {
        shift,
        content,
        changes: {
            novedades: { old: oldContent, new: content }
        }
    }, undefined, recordDate);
};

/**
 * Log CUDYR score modification (throttled - only logs once per 15 min for same patient)
 * This prevents logging every individual field change.
 */
export const logCudyrModified = (bedId: string, patientName: string, rut: string, field: string, value: number, oldValue: number, recordDate: string): Promise<void> => {
    // Use throttled logging - only one log per patient per 15 min window
    const throttleKey = `CUDYR_MODIFIED-${bedId}-${recordDate}`;

    // Check if already logged recently
    if (!shouldLogViewAction('CUDYR_MODIFIED' as AuditAction)) {
        console.log(`📋 CUDYR log throttled for ${bedId} (logged within last 15 min)`);
        return Promise.resolve();
    }

    // Update throttle state
    updateViewThrottleState(throttleKey);

    // Log with changes object for Diff View
    return logAuditEvent(
        getCurrentUserEmail(),
        'CUDYR_MODIFIED',
        'patient',
        bedId,
        {
            patientName,
            bedId,
            lastField: field,
            lastValue: value,
            changes: {
                [field]: { old: oldValue, new: value }
            }
        },
        rut,
        recordDate
    );
};

/**
 * Log user login and store start time for duration calculation
 */
export const logUserLogin = async (email: string): Promise<void> => {
    // Store login time in sessionStorage to calculate duration on logout
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('hhr_session_start', new Date().toISOString());
    }

    // Fetch and cache IP address for future audit logs
    fetchAndCacheIpAddress().catch(() => {
        // Ignore errors - IP tracking is optional
    });

    return logAuditEvent(email, 'USER_LOGIN', 'user', email, { event: 'login' });
};

/**
 * Log user logout and calculate session duration
 */
export const logUserLogout = (email: string, reason: 'manual' | 'automatic' = 'manual'): Promise<void> => {
    let durationSec = 0;
    if (typeof sessionStorage !== 'undefined') {
        const start = sessionStorage.getItem('hhr_session_start');
        if (start) {
            durationSec = Math.floor((new Date().getTime() - new Date(start).getTime()) / 1000);
            sessionStorage.removeItem('hhr_session_start');
        }
    }

    return logAuditEvent(email, 'USER_LOGOUT', 'user', email, {
        event: 'logout',
        reason,
        durationSeconds: durationSec,
        durationFormatted: durationSec > 0 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : 'Unknown'
    });
};
