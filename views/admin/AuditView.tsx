import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    ClipboardList, Search, RefreshCw, Clock, User, Users, TrendingUp,
    FileText, Filter, Download, ChevronDown, ChevronRight, Zap, Rows3, List,
    Calendar, AlertCircle, CheckCircle2, Trash2, LogIn, Eye, Activity, BarChart3,
    MapPin, LogOut, GitBranch, MessageSquare, Stethoscope, Info, X, Key,
    Box, Boxes, FileDown, LayoutGrid, History, BedDouble
} from 'lucide-react';
import { getAuditLogs, AUDIT_ACTION_LABELS } from '../../services/admin/auditService';
import { AuditLogEntry, AuditAction } from '../../types/audit';
import { generateAuditWorkbook } from '../../services/exporters/auditWorkbook';
import { workbookToBuffer } from '../../services/exporters/excelUtils';
import { saveAs } from 'file-saver';
import clsx from 'clsx';
import { useAuditStats, formatDuration, getActionCriticality } from '../../hooks/useAuditStats';

// Format ISO timestamp to readable format
const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

// Action Icon Mapping
const actionIcons: Record<AuditAction, React.ReactNode> = {
    'PATIENT_ADMITTED': <CheckCircle2 size={14} />,
    'PATIENT_DISCHARGED': <LogOut size={14} />,
    'PATIENT_TRANSFERRED': <GitBranch size={14} />,
    'PATIENT_MODIFIED': <Activity size={14} />,
    'PATIENT_CLEARED': <Trash2 size={14} />,
    'DAILY_RECORD_DELETED': <Trash2 size={14} />,
    'DAILY_RECORD_CREATED': <FileText size={14} />,
    'PATIENT_VIEWED': <Eye size={14} />,
    'NURSE_HANDOFF_MODIFIED': <MessageSquare size={14} />,
    'MEDICAL_HANDOFF_MODIFIED': <Stethoscope size={14} />,
    'HANDOFF_NOVEDADES_MODIFIED': <AlertCircle size={14} />,
    'CUDYR_MODIFIED': <BarChart3 size={14} />,
    'USER_LOGIN': <LogIn size={14} />,
    'USER_LOGOUT': <LogOut size={14} />,
    'VIEW_CUDYR': <Eye size={14} />,
    'VIEW_NURSING_HANDOFF': <Eye size={14} />,
    'VIEW_MEDICAL_HANDOFF': <Eye size={14} />,
    'BED_BLOCKED': <X size={14} />,
    'BED_UNBLOCKED': <CheckCircle2 size={14} />,
    'EXTRA_BED_TOGGLED': <Zap size={14} />,
    'MEDICAL_HANDOFF_SIGNED': <User size={14} />
};



// Action color mapping - Enhanced with semantic shades
const actionColors: Record<AuditAction, string> = {
    'PATIENT_ADMITTED': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'PATIENT_DISCHARGED': 'bg-blue-50 text-blue-700 border-blue-100',
    'PATIENT_TRANSFERRED': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'PATIENT_MODIFIED': 'bg-amber-50 text-amber-700 border-amber-100',
    'PATIENT_CLEARED': 'bg-slate-50 text-slate-700 border-slate-100',
    'DAILY_RECORD_DELETED': 'bg-rose-50 text-rose-700 border-rose-100',
    'DAILY_RECORD_CREATED': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    'PATIENT_VIEWED': 'bg-teal-50 text-teal-700 border-teal-100',
    'NURSE_HANDOFF_MODIFIED': 'bg-purple-50 text-purple-700 border-purple-100',
    'MEDICAL_HANDOFF_MODIFIED': 'bg-sky-50 text-sky-700 border-sky-100',
    'HANDOFF_NOVEDADES_MODIFIED': 'bg-orange-50 text-orange-700 border-orange-100',
    'CUDYR_MODIFIED': 'bg-yellow-50 text-yellow-700 border-yellow-100',
    'USER_LOGIN': 'bg-violet-50 text-violet-700 border-violet-100',
    'USER_LOGOUT': 'bg-gray-50 text-gray-700 border-gray-100',
    'VIEW_CUDYR': 'bg-amber-50 text-amber-700 border-amber-100',
    'VIEW_NURSING_HANDOFF': 'bg-purple-50 text-purple-700 border-purple-100',
    'VIEW_MEDICAL_HANDOFF': 'bg-sky-50 text-sky-700 border-sky-100',
    'BED_BLOCKED': 'bg-rose-50 text-rose-700 border-rose-100',
    'BED_UNBLOCKED': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'EXTRA_BED_TOGGLED': 'bg-cyan-50 text-cyan-700 border-cyan-100',
    'MEDICAL_HANDOFF_SIGNED': 'bg-indigo-50 text-indigo-700 border-indigo-100'
};

const renderHumanDetails = (log: AuditLogEntry) => {
    const details = log.details || {};
    switch (log.action) {
        case 'PATIENT_ADMITTED':
            return `Se ingresó al paciente ${details.patientName || 'ANÓNIMO'} en la cama ${details.bedId || log.entityId}.`;
        case 'PATIENT_DISCHARGED':
            return `Se dio el alta a ${details.patientName || 'ANÓNIMO'} con estado "${details.status || 'Egreso'}".`;
        case 'PATIENT_TRANSFERRED':
            return `Se trasladó a ${details.patientName || 'ANÓNIMO'} hacia ${details.destination || 'otro centro'}.`;
        case 'PATIENT_MODIFIED':
            return `Se actualizaron los datos clínicos del paciente ${details.patientName || ''}.`;
        case 'PATIENT_CLEARED':
            return `Se liberó la cama ${details.bedId || log.entityId} (Paciente: ${details.patientName || 'N/A'}).`;
        case 'DAILY_RECORD_CREATED':
            return `Se creó el registro clínico para el día ${log.entityId}.`;
        case 'DAILY_RECORD_DELETED':
            return `Se eliminó permanentemente el registro clínico del ${log.entityId}.`;
        case 'CUDYR_MODIFIED':
            return `Se actualizó la evaluación CUDYR(${details.field || 'valor'}): ${details.value || '0'}.`;
        case 'NURSE_HANDOFF_MODIFIED':
            return `Modificación de nota de enfermería(${details.shift === 'day' ? 'Día' : 'Noche'}).`;
        case 'MEDICAL_HANDOFF_MODIFIED':
            return `Se editó la evolución médica del paciente.`;
        case 'HANDOFF_NOVEDADES_MODIFIED':
            return `Se actualizó la sección de novedades generales(${details.shift || 'turno'}).`;
        case 'VIEW_CUDYR':
            return `El usuario visualizó la planilla de categorización CUDYR.`;
        case 'BED_BLOCKED':
            return `Cama ${details.bedId || log.entityId} bloqueada${details.reason ? `: ${details.reason}` : ''}.`;
        case 'BED_UNBLOCKED':
            return `Cama ${details.bedId || log.entityId} desbloqueada.`;
        case 'EXTRA_BED_TOGGLED':
            return `Cama extra ${details.bedId || log.entityId} ${details.active ? 'activada' : 'desactivada'}.`;
        case 'MEDICAL_HANDOFF_SIGNED':
            return `Se registró la firma médica de ${(details.doctorName as string) || 'un profesional'}.`;
        case 'VIEW_NURSING_HANDOFF':
            return `Visualización de la entrega de turno de enfermería(${details.shift || 'turno'}).`;
        case 'VIEW_MEDICAL_HANDOFF':
            return `Visualización de la entrega de turno médica.`;
        default:
            return JSON.stringify(details).slice(0, 100) + '...';
    }
};

// ============================================================================
// Export Keys Panel - Shows passwords for census dates
// ============================================================================
const ExportKeysPanel: React.FC = () => {
    const [passwords, setPasswords] = useState<Array<{ date: string; password: string; source?: string; createdAt?: string }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPasswords = async () => {
            setLoading(true);
            try {
                // Fetch stored passwords from Firestore
                const { getStoredPasswords } = await import('../../services/security/exportPasswordService');
                const storedPasswords = await getStoredPasswords(60); // Last 60 passwords

                setPasswords(storedPasswords.map(p => ({
                    date: p.date,
                    password: p.password,
                    source: (p as any).source,
                    createdAt: p.createdAt
                })));
            } catch (error) {
                console.error('Failed to load passwords:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPasswords();
    }, []);

    const formatDateDisplay = (dateStr: string): string => {
        const [year, month, day] = dateStr.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${day} ${monthNames[parseInt(month, 10) - 1]} ${year} `;
    };

    const copyToClipboard = (password: string) => {
        navigator.clipboard.writeText(password);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <RefreshCw size={32} className="animate-spin text-rose-500 mx-auto mb-4" />
                <p className="text-slate-400">Cargando claves de exportación...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-pink-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-200">
                        <Key className="text-white" size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Claves de Exportación Excel</h3>
                        <p className="text-sm text-slate-500">
                            Registro permanente de contraseñas usadas en archivos exportados. Guardadas automáticamente en Firestore.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4">
                {passwords.length === 0 ? (
                    <div className="text-center py-12">
                        <Key size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500 font-medium">No hay claves registradas aún</p>
                        <p className="text-slate-400 text-sm mt-1">Las claves se guardan automáticamente al enviar correos o descargar archivos Excel.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {passwords.map(({ date, password, source }) => (
                            <div
                                key={date}
                                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all group"
                            >
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span className="font-medium text-slate-700">{formatDateDisplay(date)}</span>
                                    </div>
                                    {source && (
                                        <span className={clsx(
                                            "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded w-fit",
                                            source === 'email' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                        )}>
                                            {source === 'email' ? '📧 Correo' : '📥 Descarga'}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(password)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 transition-all font-mono text-sm font-bold text-rose-600 group-hover:shadow-sm"
                                    title="Clic para copiar"
                                >
                                    {password}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-emerald-50/50">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-medium">
                    <CheckCircle2 size={14} />
                    <span>Las claves se guardan permanentemente en Firestore. Si necesita una clave antigua, siempre estará disponible aquí.</span>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// Area 11: Patient Traceability Component
// ============================================================================
interface PatientTraceabilityProps {
    logs: AuditLogEntry[];
    searchRut: string;
    onSelectPatient: (rut: string) => void;
}

const PatientTraceabilityComponent: React.FC<PatientTraceabilityProps> = ({ logs, searchRut, onSelectPatient }) => {
    const [traceTab, setTraceTab] = useState<'TIMELINE' | 'SUMMARY'>('TIMELINE');

    // Area 12: List of patients hospitalized in the last 30 days
    const recentPatients = useMemo(() => {
        const patientMap = new Map<string, { rut: string, name: string, lastEvent: string }>();

        // Filter logs that have patient info
        logs.forEach(log => {
            const rut = (log.patientIdentifier || (log.details as any)?.rut as string || '').replace(/[^0-9kK]/g, '').toLowerCase();
            const name = (log.details as any)?.patientName as string;

            if (rut && name) {
                const existing = patientMap.get(rut);
                if (!existing || new Date(log.timestamp) > new Date(existing.lastEvent)) {
                    patientMap.set(rut, { rut, name, lastEvent: log.timestamp });
                }
            }
        });

        return Array.from(patientMap.values())
            .sort((a, b) => new Date(b.lastEvent).getTime() - new Date(a.lastEvent).getTime())
            .slice(0, 10);
    }, [logs]);

    // Sort by timestamp asc for chronology
    const chronologicalLogs = useMemo(() => {
        if (!searchRut) return [];
        return [...logs].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }, [logs, searchRut]);

    // Basic aggregation
    const admissions = useMemo(() => chronologicalLogs.filter(l => l.action === 'PATIENT_ADMITTED'), [chronologicalLogs]);
    const discharges = useMemo(() => chronologicalLogs.filter(l => l.action === 'PATIENT_DISCHARGED'), [chronologicalLogs]);
    const lastNote = useMemo(() => chronologicalLogs.filter(l => (l.details as any)?.pathology).pop(), [chronologicalLogs]);
    const lastBed = useMemo(() => chronologicalLogs.filter(l => (l.details as any)?.bedId).pop(), [chronologicalLogs]);

    // Area 13: Advanced Clinical Processing
    const clinicalData = useMemo(() => {
        const bedHistory: { bedId: string, from: Date, to: Date | null, days: number }[] = [];
        let totalUpcMs = 0;
        const diagnosisHistory: { date: Date, pathology: string }[] = [];
        const devicesHistory: { date: Date, name: string, action: 'INSTALL' | 'REMOVE', details: string }[] = [];

        if (!searchRut || chronologicalLogs.length === 0) {
            return {
                bedHistory: [],
                totalUpcDays: 0,
                diagnosisHistory: [],
                devicesHistory: [],
                firstAdmission: undefined,
                lastDischarge: undefined
            };
        }

        // Track current state during iteration
        let currentBed: string | null = null;
        let lastBedChange: Date | null = null;
        let isCurrentlyUpc = false;
        let lastUpcChange: Date | null = null;

        chronologicalLogs.forEach((log) => {
            const timestamp = new Date(log.timestamp);
            const details = log.details as any;

            // 1. Bed tracking
            const logBedId = details?.bedId;
            if (logBedId && logBedId !== currentBed) {
                if (currentBed && lastBedChange) {
                    const duration = timestamp.getTime() - lastBedChange.getTime();
                    bedHistory.push({
                        bedId: currentBed,
                        from: lastBedChange,
                        to: timestamp,
                        days: Math.max(1, Math.ceil(duration / (1000 * 60 * 60 * 24)))
                    });
                }
                currentBed = logBedId;
                lastBedChange = timestamp;
            }

            // 2. UPC tracking (clinicalFlags.isUPC or isUPC)
            const upcNew = details?.changes?.isUPC?.new ?? details?.changes?.["clinicalFlags.isUPC"]?.new ?? details?.isUPC;
            if (upcNew !== undefined && upcNew !== isCurrentlyUpc) {
                if (isCurrentlyUpc && lastUpcChange) {
                    totalUpcMs += timestamp.getTime() - lastUpcChange.getTime();
                }
                isCurrentlyUpc = !!upcNew;
                lastUpcChange = timestamp;
            }

            // 3. Diagnosis evolution
            const pathology = details?.changes?.pathology?.new || details?.pathology;
            if (pathology) {
                diagnosisHistory.push({ date: timestamp, pathology });
            }

            // 4. Invasive devices
            if (details?.changes?.deviceDetails) {
                Object.entries(details.changes.deviceDetails).forEach(([name, delta]: [string, any]) => {
                    devicesHistory.push({
                        date: timestamp,
                        name,
                        action: delta.new ? 'INSTALL' : 'REMOVE',
                        details: delta.new?.installationDate ? `Instalado el ${delta.new.installationDate}` : 'Retirado'
                    });
                });
            }
        });

        // Close last bed
        if (currentBed && lastBedChange) {
            const lastLog = discharges[discharges.length - 1];
            const end = (discharges.length > 0 && lastLog) ? new Date(lastLog.timestamp) : new Date();
            const duration = end.getTime() - (lastBedChange as Date).getTime();
            bedHistory.push({
                bedId: currentBed,
                from: lastBedChange,
                to: discharges.length > 0 ? end : null,
                days: Math.max(1, Math.ceil(duration / (1000 * 60 * 60 * 24)))
            });
        }

        // Close last UPC period
        if (isCurrentlyUpc && lastUpcChange) {
            const lastLog = discharges[discharges.length - 1];
            const end = (discharges.length > 0 && lastLog) ? new Date(lastLog.timestamp) : new Date();
            totalUpcMs += end.getTime() - (lastUpcChange as Date).getTime();
        }

        return {
            bedHistory: bedHistory.reverse(),
            totalUpcDays: Math.ceil(totalUpcMs / (1000 * 60 * 60 * 24)),
            diagnosisHistory: diagnosisHistory.reverse(),
            devicesHistory: devicesHistory.reverse(),
            firstAdmission: admissions[0]?.timestamp,
            lastDischarge: discharges[discharges.length - 1]?.timestamp
        };
    }, [searchRut, chronologicalLogs, admissions, discharges]);

    if (!searchRut) {
        return (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History size={32} className="text-cyan-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Trazabilidad Clínica</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                    Ingrese un RUT en el buscador superior o seleccione un paciente reciente de la lista para reconstruir su historia clínica.
                </p>

                {recentPatients.length > 0 && (
                    <div className="max-w-2xl mx-auto">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-left">Pacientes Recientes</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {recentPatients.map(p => (
                                <button
                                    key={p.rut}
                                    onClick={() => onSelectPatient(p.rut)}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50 transition-all text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-white flex items-center justify-center text-slate-400 group-hover:text-cyan-500 transition-colors">
                                        <User size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{p.rut}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 group-hover:text-cyan-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Sin registros</h3>
                <p className="text-slate-500">No se encontraron eventos asociados al RUT {searchRut}.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Patient Header Summary */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg border border-cyan-500/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                            <User size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">{(lastNote?.details as any)?.patientName || 'Paciente'}</h2>
                            <p className="text-cyan-100 font-mono text-lg">{searchRut}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-8">
                        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                            <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest text-center">Estado Actual</p>
                            <p className="text-lg font-black text-center">{discharges.length >= admissions.length ? '🏠 ALTA' : '🏥 HOSPITALIZADO'}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                            <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest text-center">Ingresos</p>
                            <p className="text-lg font-black text-center">{admissions.length}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
                            <p className="text-[10px] font-bold text-cyan-200 uppercase tracking-widest text-center">Última Cama</p>
                            <p className="text-lg font-black text-center">{(lastBed?.details as any)?.bedId || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Area 13: Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl w-fit border border-slate-200/50">
                <button
                    onClick={() => setTraceTab('TIMELINE')}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        traceTab === 'TIMELINE' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    )}
                >
                    <History size={14} />
                    Línea de Tiempo
                </button>
                <button
                    onClick={() => setTraceTab('SUMMARY')}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        traceTab === 'SUMMARY' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                    )}
                >
                    <FileText size={14} />
                    Resumen Clínico
                </button>
            </div>

            {traceTab === 'TIMELINE' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Timeline Column */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <History size={18} className="text-cyan-500" />
                                    Historial Cronológico
                                </h3>
                                <span className="text-xs text-slate-400 font-medium">{chronologicalLogs.length} eventos registrados</span>
                            </div>
                            <div className="p-6 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-9 top-6 bottom-6 w-0.5 bg-slate-100" />

                                <div className="space-y-8">
                                    {chronologicalLogs.map((log) => {
                                        const date = new Date(log.timestamp);
                                        const isAdmission = log.action === 'PATIENT_ADMITTED';
                                        const isDischarge = log.action === 'PATIENT_DISCHARGED';
                                        const isTransfer = log.action === 'PATIENT_TRANSFERRED';
                                        const isDevice = (log.details as any)?.changes?.deviceDetails;

                                        return (
                                            <div key={log.id} className="relative flex gap-6 group">
                                                {/* Date/Time Bubble */}
                                                <div className="w-16 pt-1 text-right">
                                                    <p className="text-xs font-black text-slate-900 leading-none">{date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium mt-1">{date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>

                                                {/* Timeline Node */}
                                                <div className={clsx(
                                                    "relative z-10 w-6 h-6 rounded-full border-4 border-white shadow-sm mt-1 flex-shrink-0",
                                                    isAdmission ? "bg-emerald-500" :
                                                        isDischarge ? "bg-rose-500" :
                                                            isTransfer ? "bg-amber-500" :
                                                                isDevice ? "bg-cyan-500" :
                                                                    "bg-slate-300"
                                                )} />

                                                {/* Event Card */}
                                                <div className={clsx(
                                                    "flex-1 p-4 rounded-xl border transition-all group-hover:shadow-md",
                                                    isAdmission ? "bg-emerald-50/50 border-emerald-100" :
                                                        isDischarge ? "bg-rose-50/50 border-rose-100" :
                                                            isTransfer ? "bg-amber-50/50 border-amber-100" :
                                                                "bg-white border-slate-100"
                                                )}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            {AUDIT_ACTION_LABELS[log.action]}
                                                        </h4>
                                                        <span className="text-[10px] text-slate-400 font-mono">#{log.id.slice(-6)}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                                        {log.summary}
                                                    </p>

                                                    {/* Specialized Detail Display for Traceability */}
                                                    {(log.details as any)?.changes && (
                                                        <div className="mt-3 bg-white/60 rounded-lg p-2.5 border border-slate-100/50 space-y-2">
                                                            {Object.entries((log.details as any).changes).map(([field, delta]: [string, any]) => {
                                                                if (field === 'deviceDetails') {
                                                                    return Object.entries(delta).map(([dev, values]: [string, any]) => (
                                                                        <div key={dev} className="flex items-center gap-2 text-[10px]">
                                                                            <span className="bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-bold">{dev}</span>
                                                                            <span className="text-slate-400">➔</span>
                                                                            <span className="text-slate-600">{values.new?.installationDate ? `Instalado ${values.new.installationDate}` : 'Retirado'}</span>
                                                                        </div>
                                                                    ));
                                                                }
                                                                return (
                                                                    <div key={field} className="flex items-center gap-2 text-[10px]">
                                                                        <span className="text-slate-400 italic capitalize">{field}:</span>
                                                                        <span className="text-slate-500 line-through">{(delta.old as string) || 'n/a'}</span>
                                                                        <span className="text-slate-400">➔</span>
                                                                        <span className="text-slate-700 font-bold">{(delta.new as string) || 'n/a'}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    <div className="mt-2 flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                                            {log.userId.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-[9px] text-slate-400">Acción by {log.userId.split('@')[0]}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Patient Summary & Stats Column (Original Content Restored) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Diagnosis Evolution */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                <Stethoscope size={18} className="text-amber-500" />
                                <h3 className="font-bold text-slate-700">Diagnóstico</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {chronologicalLogs.filter(l => (l.details as any)?.changes?.pathology).map((log) => (
                                    <div key={log.id} className="relative pl-4 border-l-2 border-amber-100 pb-2 last:pb-0">
                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleDateString()}</p>
                                        <p className="text-xs text-slate-700 mt-1">{((log.details as any)?.changes?.pathology.new as string)}</p>
                                    </div>
                                ))}
                                {chronologicalLogs.filter(l => (l.details as any)?.changes?.pathology).length === 0 && (
                                    <p className="text-xs text-slate-400 italic">No hay registros de evolución diagnóstica.</p>
                                )}
                            </div>
                        </div>

                        {/* Stay Stats */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                                <Clock size={18} className="text-indigo-500" />
                                <h3 className="font-bold text-slate-700">Estadía Total</h3>
                            </div>
                            <div className="p-5">
                                {admissions.map((adm, idx) => {
                                    const nextDischarge = discharges.find(d => new Date(d.timestamp) > new Date(adm.timestamp));
                                    const end = nextDischarge ? new Date(nextDischarge.timestamp) : new Date();
                                    const days = Math.ceil((end.getTime() - new Date(adm.timestamp).getTime()) / (1000 * 60 * 60 * 24));

                                    return (
                                        <div key={adm.id} className="mb-4 last:mb-0 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-slate-400">PERIODO {idx + 1}</span>
                                                <span className={clsx(
                                                    "text-[9px] px-1.5 py-0.5 rounded font-black",
                                                    nextDischarge ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"
                                                )}>
                                                    {nextDischarge ? 'FINALIZADO' : 'ACTIVO'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-700">
                                                {new Date(adm.timestamp).toLocaleDateString()} - {nextDischarge ? new Date(nextDischarge.timestamp).toLocaleDateString() : 'Actualidad'}
                                            </p>
                                            <div className="mt-2 flex items-end gap-1">
                                                <span className="text-2xl font-black text-indigo-600 leading-none">{days}</span>
                                                <span className="text-[10px] font-bold text-indigo-400 mb-0.5">DÍAS</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Area 13: Clinical Summary View */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* Left Column: Stats & Bed History */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Summary Header Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                                    <Clock className="text-cyan-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estadía Hospitalaria</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {(() => {
                                            const start = clinicalData.firstAdmission ? new Date(clinicalData.firstAdmission) : null;
                                            const end = clinicalData.lastDischarge ? new Date(clinicalData.lastDischarge) : new Date();
                                            if (!start) return '-';
                                            return `${Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))} días`;
                                        })()}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                    <Zap className="text-amber-600" size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estadía UPC (Ticket)</p>
                                    <p className="text-2xl font-black text-slate-900">{clinicalData.totalUpcDays} días</p>
                                </div>
                            </div>
                        </div>

                        {/* Bed Movement History */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
                                <BedDouble size={18} className="text-indigo-500" />
                                <h3 className="font-bold text-slate-700">Historial de Camas y Movimientos</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-5 py-3 text-left">Cama</th>
                                            <th className="px-5 py-3 text-left">Desde</th>
                                            <th className="px-5 py-3 text-left">Hasta</th>
                                            <th className="px-5 py-3 text-right">Días</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {clinicalData.bedHistory.map((move, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <span className="font-black text-slate-700 flex items-center gap-2">
                                                        <MapPin size={12} className="text-slate-300" />
                                                        {move.bedId}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-slate-500">{move.from.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-5 py-3 text-slate-500">
                                                    {move.to ? move.to.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : (
                                                        <span className="text-emerald-500 font-bold uppercase text-[9px]">Actual</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-right font-black text-indigo-600">{move.days}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Diagnosis & Devices */}
                    <div className="space-y-6">
                        {/* Diagnosis History */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
                                <Stethoscope size={18} className="text-rose-500" />
                                <h3 className="font-bold text-slate-700">Evolución Diagnóstica</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {clinicalData.diagnosisHistory.map((dx, idx) => (
                                    <div key={idx} className="relative pl-4 border-l-2 border-rose-100 pb-2 last:pb-0">
                                        <p className="text-[10px] text-slate-400 font-bold">{dx.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</p>
                                        <p className="text-xs text-slate-700 mt-1 font-medium">{dx.pathology}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Invasive Devices History */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
                                <Activity size={18} className="text-cyan-500" />
                                <h3 className="font-bold text-slate-700">Dispositivos Invasivos</h3>
                            </div>
                            <div className="p-5 space-y-4">
                                {clinicalData.devicesHistory.map((dev, idx) => (
                                    <div key={idx} className="flex items-start gap-4">
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full mt-1.5",
                                            dev.action === 'INSTALL' ? "bg-emerald-500" : "bg-rose-400"
                                        )} />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-400">{dev.date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}</span>
                                                <span className={clsx(
                                                    "text-[8px] font-black px-1.5 py-0.5 rounded",
                                                    dev.action === 'INSTALL' ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {dev.action === 'INSTALL' ? 'INSTALADO' : 'RETIRADO'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 mt-0.5">{dev.name}</p>
                                            <p className="text-[10px] text-slate-500">{dev.details}</p>
                                        </div>
                                    </div>
                                ))}
                                {clinicalData.devicesHistory.length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-4">Sin registros de dispositivos.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const AuditView: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<AuditAction | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [showMetadata, setShowMetadata] = useState<Set<string>>(new Set());
    const [showComplianceInfo, setShowComplianceInfo] = useState(false);
    const [compactView, setCompactView] = useState(false);
    const [groupedView, setGroupedView] = useState(false);
    const [searchRut, setSearchRut] = useState('');

    // Pagination state
    const ITEMS_PER_PAGE = 50;
    const [currentPage, setCurrentPage] = useState(1);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getAuditLogs(1000); // Fetch more for better history
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const workbook = await generateAuditWorkbook(filteredLogs);
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `auditoria_hospital_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    const [activeSection, setActiveSection] = useState<AuditSection>('ALL');

    type AuditSection = 'ALL' | 'TIMELINE' | 'SESSIONS' | 'CENSUS' | 'CUDYR' | 'HANDOFF_NURSE' | 'HANDOFF_MEDICAL' | 'EXPORT_KEYS' | 'TRACEABILITY';

    interface SectionConfig {
        label: string;
        color: string;
        actions?: string[];
    }

    const sections: Record<AuditSection, SectionConfig> = {
        'ALL': { label: 'Todos', color: 'bg-slate-100 text-slate-600' },
        'TRACEABILITY': { label: '🏥 Trazabilidad', color: 'bg-cyan-100 text-cyan-700', actions: ['PATIENT_ADMITTED', 'PATIENT_DISCHARGED', 'PATIENT_TRANSFERRED', 'PATIENT_MODIFIED', 'BED_BLOCKED', 'BED_UNBLOCKED', 'MEDICAL_HANDOFF_SIGNED'] },
        'TIMELINE': { label: '📅 Timeline', color: 'bg-violet-100 text-violet-700', actions: ['USER_LOGIN', 'USER_LOGOUT'] },
        'SESSIONS': { label: 'Sesiones', color: 'bg-indigo-100 text-indigo-700', actions: ['USER_LOGIN', 'USER_LOGOUT'] },
        'CENSUS': { label: 'Censo Diario', color: 'bg-emerald-100 text-emerald-700', actions: ['PATIENT_ADMITTED', 'PATIENT_DISCHARGED', 'PATIENT_TRANSFERRED', 'PATIENT_MODIFIED', 'PATIENT_CLEARED', 'DAILY_RECORD_CREATED', 'DAILY_RECORD_DELETED', 'BED_BLOCKED', 'BED_UNBLOCKED', 'EXTRA_BED_TOGGLED'] },
        'CUDYR': { label: 'CUDYR', color: 'bg-amber-100 text-amber-700', actions: ['CUDYR_MODIFIED', 'VIEW_CUDYR'] },
        'HANDOFF_NURSE': { label: 'Entrega Enfermería', color: 'bg-purple-100 text-purple-700', actions: ['NURSE_HANDOFF_MODIFIED', 'VIEW_NURSING_HANDOFF', 'HANDOFF_NOVEDADES_MODIFIED'] },
        'HANDOFF_MEDICAL': { label: 'Entrega Médica', color: 'bg-sky-100 text-sky-700', actions: ['MEDICAL_HANDOFF_MODIFIED', 'VIEW_MEDICAL_HANDOFF', 'HANDOFF_NOVEDADES_MODIFIED', 'MEDICAL_HANDOFF_SIGNED'] },
        'EXPORT_KEYS': { label: 'Claves Excel', color: 'bg-rose-100 text-rose-700', actions: [] }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = new Date(log.timestamp);
            const patientName = (log.details?.patientName as string) || '';
            const searchLower = searchTerm.toLowerCase();

            // 1. RUT Search (Area 11) - Highest Priority
            if (searchRut && searchRut.trim() !== '') {
                const rutClean = searchRut.replace(/[^0-9kK]/g, '').toLowerCase();
                const rawLogRut = (log.details?.rut as string || '').replace(/[^0-9kK]/g, '').toLowerCase();

                // Prioritize unmasked RUT check
                if (rawLogRut && rawLogRut === rutClean) {
                    // Match found
                } else if (log.patientIdentifier?.includes('***')) {
                    // Fallback: Check if prefix of masked identifier matches
                    const maskedPrefix = log.patientIdentifier.split('*')[0].replace(/[^0-9kK]/g, '').toLowerCase();
                    if (maskedPrefix && rutClean.startsWith(maskedPrefix)) {
                        // Likely a match for legacy data
                    } else {
                        return false;
                    }
                } else {
                    const logRutSimple = (log.patientIdentifier || '').replace(/[^0-9kK]/g, '').toLowerCase();
                    if (logRutSimple !== rutClean) return false;
                }
            }

            // 2. Global Search (Simplified Area 12: Name or RUT only)
            const matchesSearch = !searchTerm ||
                (log.patientIdentifier || '').toLowerCase().includes(searchLower) ||
                (log.details?.rut as string || '').toLowerCase().includes(searchLower) ||
                patientName.toLowerCase().includes(searchLower);

            // 3. Action Filter
            const matchesFilter = filterAction === 'ALL' || log.action === filterAction;

            // 4. Section categorization
            const matchesSection = activeSection === 'ALL' ||
                sections[activeSection].actions?.includes(log.action);

            // 5. Date Filter
            const matchesDate = (!startDate || logDate >= new Date(startDate)) &&
                (!endDate || logDate <= new Date(endDate + 'T23:59:59'));

            return matchesSearch && matchesFilter && matchesDate && matchesSection;
        });
    }, [logs, searchTerm, searchRut, filterAction, activeSection, startDate, endDate]);

    /**
     * Group logs by User + Action + Date (Area 6)
     */
    const displayLogs = useMemo(() => {
        if (!groupedView) return filteredLogs;

        const groups: Record<string, AuditLogEntry[]> = {};
        filteredLogs.forEach(log => {
            // Group by User + Action + Date
            const dateStr = log.recordDate || new Date(log.timestamp).toISOString().split('T')[0];
            const groupKey = `${log.userId}-${log.action}-${dateStr}`;
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(log);
        });

        return Object.entries(groups).map(([key, group]) => {
            const first = group[0];
            const last = group[group.length - 1]; // Use latest for timestamp

            return {
                ...first,
                id: `group-${key}`,
                timestamp: last.timestamp,
                summary: `${AUDIT_ACTION_LABELS[first.action] || first.action} (${group.length} registros)`,
                isGroup: true,
                childLogs: group
            } as any;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [filteredLogs, groupedView]);

    // Pagination calculations
    const totalPages = Math.ceil(displayLogs.length / ITEMS_PER_PAGE);
    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return displayLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [displayLogs, currentPage, ITEMS_PER_PAGE]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterAction, activeSection, startDate, endDate]);

    // Statistics
    const stats = useAuditStats(logs);

    // PDF Export using browser print
    const handlePdfExport = useCallback(() => {
        const printContent = `
    <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                    <title>Reporte de Auditoría - Hospital de Hanga Roa</title>
                    <style>
                        @page { size: landscape; margin: 1.5cm; }
                        body { font-family: Arial, sans-serif; font-size: 10px; color: #333; }
                        h1 { font-size: 16px; margin-bottom: 5px; }
                        h2 { font-size: 12px; color: #666; margin-bottom: 20px; font-weight: normal; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #e2e8f0; font-size: 9px; text-transform: uppercase; }
                        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
                        tr:nth-child(even) { background: #f8fafc; }
                        .critical { background: #fee2e2 !important; }
                        .header-info { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
                        .stats { display: flex; gap: 30px; }
                        .stat { text-align: center; }
                        .stat-value { font-size: 18px; font-weight: bold; color: #4f46e5; }
                        .stat-label { font-size: 9px; color: #64748b; }
                        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; text-align: center; }
                    </style>
            </head>
            <body>
                <div class="header-info">
                    <div>
                        <h1>📋 Reporte de Auditoría</h1>
                        <h2>Hospital de Hanga Roa - Sistema de Gestión Clínica</h2>
                    </div>
                    <div class="stats">
                        <div class="stat">
                            <div class="stat-value">${filteredLogs.length}</div>
                            <div class="stat-label">Registros</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${stats.activeUserCount}</div>
                            <div class="stat-label">Usuarios</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${stats.criticalCount}</div>
                            <div class="stat-label">Críticos</div>
                        </div>
                    </div>
                </div>
                <p><strong>Período:</strong> ${startDate || 'Inicio'} al ${endDate || 'Actual'} | <strong>Generado:</strong> ${new Date().toLocaleString('es-CL')}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Operador</th>
                            <th>Acción</th>
                            <th>Resumen</th>
                            <th>Paciente</th>
                            <th>Cama</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLogs.slice(0, 200).map(log => {
            const isCritical = ['PATIENT_ADMITTED', 'PATIENT_DISCHARGED', 'PATIENT_TRANSFERRED', 'DAILY_RECORD_DELETED'].includes(log.action);
            const patientName = (log.details?.patientName as string) || '-';
            const bedId = (log.details?.bedId as string) || '-';
            return `<tr class="${isCritical ? 'critical' : ''}">
                                <td>${formatTimestamp(log.timestamp)}</td>
                                <td>${log.userDisplayName || (log.userId || '-').split('@')[0]}</td>
                                <td>${AUDIT_ACTION_LABELS[log.action] || log.action}</td>
                                <td>${log.summary || '-'}</td>
                                <td>${patientName}</td>
                                <td>${bedId}</td>
                            </tr>`;
        }).join('')}
                    </tbody>
                </table>
                ${filteredLogs.length > 200 ? '<p style="text-align: center; color: #94a3b8; margin-top: 10px;">Mostrando primeros 200 de ' + filteredLogs.length + ' registros</p>' : ''}
                <div class="footer">
                    Este documento fue generado automáticamente por el Sistema de Auditoría del Hospital de Hanga Roa.<br>
                        Los registros de auditoría no pueden ser modificados ni eliminados para cumplir con la Ley 20.584.
                </div>
            </body>
        </html>
`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }, [filteredLogs, stats, startDate, endDate]);

    return (
        <div className="space-y-6 animate-fade-in pb-24 font-sans max-w-[1400px] mx-auto">
            {/* Header: Glassmorphism */}
            <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <ClipboardList className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                            Registro de Auditoría
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Cumplimiento Ley 20.584 • Integridad Clínica</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowComplianceInfo(true)}
                        className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all border border-indigo-100"
                        title="Ver enfoque de auditoría MINSAL"
                    >
                        <Info size={20} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting || filteredLogs.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all font-bold text-sm border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <Download size={18} className={exporting ? 'animate-bounce' : ''} />
                        {exporting ? 'Exportando...' : 'Exportar Excel'}
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Stats Dashboard Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Today's Activity */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Activity className="text-indigo-600" size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Hoy
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.todayCount}</p>
                    <p className="text-xs text-slate-500 mt-1">Eventos registrados</p>
                </div>

                {/* Active Users */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                            <Users className="text-violet-600" size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                            {stats.totalSessionsToday} sesiones
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.activeUserCount}</p>
                    <p className="text-xs text-slate-500 mt-1">Usuarios activos hoy</p>
                </div>

                {/* Critical Actions */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            stats.criticalCount > 0 ? "bg-amber-50" : "bg-slate-50"
                        )}>
                            <Zap className={stats.criticalCount > 0 ? "text-amber-600" : "text-slate-400"} size={20} />
                        </div>
                        {stats.criticalCount > 0 && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                Importante
                            </span>
                        )}
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.criticalCount}</p>
                    <p className="text-xs text-slate-500 mt-1">Acciones críticas hoy</p>
                </div>

                {/* Avg Session Time */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                            <Clock className="text-sky-600" size={20} />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {stats.avgSessionMinutes > 0 ? formatDuration(stats.avgSessionMinutes) : '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Tiempo promedio sesión</p>
                </div>
            </div>

            {/* Action Breakdown Row */}
            <div className="grid grid-cols-1 gap-4">
                {/* Action Breakdown by Criticality */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <BarChart3 size={16} className="text-slate-400" />
                            Desglose por Tipo
                        </h3>
                        <span className="text-[10px] text-slate-400">Últimos {logs.length} registros</span>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(stats.actionBreakdown)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 6)
                            .map(([action, count]) => {
                                const criticality = getActionCriticality(action as AuditAction);
                                const percentage = Math.round((count / logs.length) * 100);
                                return (
                                    <div key={action} className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-1.5 h-6 rounded-full",
                                            criticality === 'critical' ? "bg-rose-500" :
                                                criticality === 'important' ? "bg-amber-500" : "bg-slate-300"
                                        )} />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-slate-700">
                                                    {AUDIT_ACTION_LABELS[action as AuditAction] || action}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500">{count}</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full rounded-full transition-all",
                                                        criticality === 'critical' ? "bg-rose-400" :
                                                            criticality === 'important' ? "bg-amber-400" : "bg-slate-300"
                                                    )}
                                                    style={{ width: `${percentage}% ` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="text-[10px] text-slate-500">Crítico</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-[10px] text-slate-500">Info</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Module Sections Navigation */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit">
                {(Object.keys(sections) as Array<keyof typeof sections>).map((key) => (
                    <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        className={clsx(
                            "px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                            activeSection === key
                                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        )}
                    >
                        <div className={clsx("w-2 h-2 rounded-full", sections[key].color.split(' ')[0].replace('bg-', 'bg-'))} />
                        {sections[key].label}
                    </button>
                ))}
            </div>

            {/* Advanced Filters Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 items-end">
                {/* Search */}
                <div className="lg:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Búsqueda Inteligente</label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Nombre o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Filter Action */}
                <div className="lg:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Acción</label>
                    <div className="relative">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value as AuditAction | 'ALL')}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                        >
                            <option value="ALL">Todas las acciones</option>
                            {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* RUT Search (Area 11) */}
                <div className="lg:col-span-5 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Búsqueda por RUT (Trazabilidad)</label>
                    <div className="relative">
                        <History size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                        <input
                            type="text"
                            placeholder="Ingrese RUT para trazabilidad clínica (ej: 12.345.678-k)"
                            value={searchRut}
                            onChange={(e) => setSearchRut(e.target.value)}
                            onFocus={() => setActiveSection('TRACEABILITY')}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-cyan-50/30 border border-cyan-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-mono"
                        />
                    </div>
                </div>

                {/* Range Picker */}
                <div className="lg:col-span-12 mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="md:col-span-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Export Keys Panel - Special Section */}
            {
                activeSection === 'EXPORT_KEYS' && (
                    <ExportKeysPanel />
                )
            }

            {/* Timeline Panel - Session visualization */}
            {
                activeSection === 'TIMELINE' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                <Clock className="text-violet-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Timeline de Sesiones</h3>
                                <p className="text-xs text-slate-500">Actividad de usuarios por sesión</p>
                            </div>
                        </div>

                        {/* Group logs by user and date */}
                        {(() => {
                            // Get unique users from today's session logs
                            const sessionLogs = logs.filter(l => ['USER_LOGIN', 'USER_LOGOUT'].includes(l.action));
                            const userSessions: Record<string, AuditLogEntry[]> = {};

                            sessionLogs.forEach(log => {
                                const userId = log.userId || 'unknown';
                                if (!userSessions[userId]) userSessions[userId] = [];
                                userSessions[userId].push(log);
                            });

                            // Get all logs grouped by user for timeline
                            const userActivity: Record<string, AuditLogEntry[]> = {};
                            logs.forEach(log => {
                                const userId = log.userId || 'unknown';
                                if (userId.includes('anonymous')) return;
                                if (!userActivity[userId]) userActivity[userId] = [];
                                userActivity[userId].push(log);
                            });

                            return (
                                <div className="space-y-6">
                                    {Object.entries(userActivity)
                                        .filter(([userId]) => !userId.includes('anonymous'))
                                        .sort((a, b) => {
                                            const lastA = new Date(a[1][0]?.timestamp || 0).getTime();
                                            const lastB = new Date(b[1][0]?.timestamp || 0).getTime();
                                            return lastB - lastA;
                                        })
                                        .slice(0, 5)
                                        .map(([userId, userLogs]) => {
                                            const loginEvent = userLogs.find(l => l.action === 'USER_LOGIN');
                                            const logoutEvent = userLogs.find(l => l.action === 'USER_LOGOUT');
                                            const sortedLogs = [...userLogs].sort((a, b) =>
                                                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                                            );

                                            return (
                                                <div key={userId} className="border border-slate-100 rounded-xl p-4">
                                                    {/* User Header */}
                                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-700">
                                                                {userId.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700">{userId.split('@')[0]}</p>
                                                                <p className="text-[10px] text-slate-400">{userId}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-slate-600">{userLogs.length} acciones</p>
                                                            {loginEvent?.ipAddress && (
                                                                <p className="text-[10px] text-slate-400 font-mono">IP: {loginEvent.ipAddress}</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Timeline */}
                                                    <div className="relative pl-6">
                                                        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />
                                                        {sortedLogs.slice(0, 10).map((log, idx) => (
                                                            <div key={log.id} className="relative mb-3 last:mb-0">
                                                                <div className={clsx(
                                                                    "absolute -left-4 w-3 h-3 rounded-full border-2 border-white shadow-sm",
                                                                    log.action === 'USER_LOGIN' ? "bg-emerald-500" :
                                                                        log.action === 'USER_LOGOUT' ? "bg-rose-500" :
                                                                            getActionCriticality(log.action) === 'critical' ? "bg-amber-500" :
                                                                                "bg-slate-300"
                                                                )} />
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-400 font-mono w-12">
                                                                            {new Date(log.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        <span className={clsx(
                                                                            "text-xs font-medium px-2 py-0.5 rounded",
                                                                            actionColors[log.action]
                                                                        )}>
                                                                            {AUDIT_ACTION_LABELS[log.action]}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                                                        {log.summary || (log.details?.patientName as string) || ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {sortedLogs.length > 10 && (
                                                            <p className="text-[10px] text-slate-400 pl-4">+{sortedLogs.length - 10} más acciones...</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            );
                        })()}
                    </div>
                )
            }

            {/* Patient Traceability Mode (Area 11) */}
            {
                activeSection === 'TRACEABILITY' && (
                    <PatientTraceabilityComponent
                        logs={logs}
                        searchRut={searchRut}
                        onSelectPatient={setSearchRut}
                    />
                )
            }

            {/* Logs Table: Modern Striped with Details */}
            {
                activeSection !== 'EXPORT_KEYS' && activeSection !== 'TIMELINE' && activeSection !== 'TRACEABILITY' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Table Toolbar */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/30">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-slate-500">
                                    {filteredLogs.length} registros
                                </span>
                                {/* Compact View Toggle */}
                                <button
                                    onClick={() => setCompactView(!compactView)}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                        compactView
                                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                    title={compactView ? "Vista normal" : "Vista compacta"}
                                >
                                    {compactView ? <List size={14} /> : <Rows3 size={14} />}
                                    {compactView ? "Compacto" : "Normal"}
                                </button>
                                {/* Grouped View Toggle (Area 6) */}
                                <button
                                    onClick={() => setGroupedView(!groupedView)}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                        groupedView
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                    title={groupedView ? "Vista individual" : "Agrupar por sección/día"}
                                >
                                    {groupedView ? <Box size={14} /> : <Boxes size={14} />}
                                    {groupedView ? "Agrupado" : "Individual"}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* PDF Export Button */}
                                <button
                                    onClick={() => {
                                        // PDF will be implemented below
                                        handlePdfExport();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all"
                                >
                                    <FileDown size={14} />
                                    PDF
                                </button>
                                {/* Excel Export Button */}
                                <button
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
                                >
                                    <Download size={14} />
                                    Excel
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                        <th className="px-6 py-4 text-left w-6"></th>
                                        <th className="px-4 py-4 text-left">Fecha/Hora</th>
                                        <th className="px-4 py-4 text-left">Operador</th>
                                        {!compactView && <th className="px-4 py-4 text-left">Acción</th>}
                                        <th className="px-4 py-4 text-left">Resumen</th>
                                        {!compactView && <th className="px-4 py-4 text-left">Paciente</th>}
                                        {!compactView && <th className="px-4 py-4 text-left">Cama</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <RefreshCw size={40} className="animate-spin text-indigo-500 opacity-20" />
                                                    <p className="text-slate-400 font-medium animate-pulse">Sincronizando registros clínicos...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-30">
                                                    <Search size={48} className="text-slate-300" />
                                                    <p className="text-slate-500 font-bold">No se encontraron rastros para los filtros aplicados</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedLogs.map((log) => {
                                            // Extract data from details for organized columns
                                            // Only use bedId from details, don't fall back to entityId (which could be a date)
                                            const bedId = (log.details?.bedId as string) || '';
                                            const patientName = (log.details?.patientName as string) || '';

                                            return (
                                                <React.Fragment key={log.id}>
                                                    <tr
                                                        className={clsx(
                                                            "group hover:bg-slate-50/80 transition-all cursor-pointer",
                                                            expandedRows.has(log.id) ? "bg-indigo-50/20" : ""
                                                        )}
                                                        onClick={() => toggleRow(log.id)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            {expandedRows.has(log.id)
                                                                ? <ChevronDown size={18} className="text-indigo-500" />
                                                                : <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500" />
                                                            }
                                                        </td>
                                                        {/* Fecha/Hora */}
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-900 font-bold">{formatTimestamp(log.timestamp).split(' ')[0]}</span>
                                                                <span className="text-[10px] text-slate-400 font-mono">{formatTimestamp(log.timestamp).split(' ')[1]}</span>
                                                            </div>
                                                        </td>
                                                        {/* Operador */}
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                                    {(log.userDisplayName || log.userId || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]" title={log.userId || 'Usuario desconocido'}>
                                                                        {log.userDisplayName || (log.userId || 'anon@hhr.cl').split('@')[0]}
                                                                    </span>
                                                                    {log.ipAddress && (
                                                                        <span className="text-[9px] text-slate-400 font-mono">
                                                                            IP: {log.ipAddress}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {/* Acción (badge) - hidden in compact */}
                                                        {!compactView && (
                                                            <td className="px-4 py-4">
                                                                <span className={clsx(
                                                                    "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border shadow-sm whitespace-nowrap",
                                                                    actionColors[log.action as AuditAction] || "bg-slate-50 text-slate-700 border-slate-100"
                                                                )}>
                                                                    {actionIcons[log.action as AuditAction]}
                                                                    {AUDIT_ACTION_LABELS[log.action as AuditAction]}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {/* Resumen (HUMAN READABLE) */}
                                                        <td className="px-4 py-4">
                                                            <span
                                                                className={clsx(
                                                                    "text-xs text-slate-700 font-medium block truncate",
                                                                    compactView ? "max-w-[300px]" : "max-w-[180px]"
                                                                )}
                                                                title={log.summary || renderHumanDetails(log)}
                                                            >
                                                                {log.summary || renderHumanDetails(log)}
                                                            </span>
                                                        </td>
                                                        {/* Paciente - hidden in compact */}
                                                        {!compactView && (
                                                            <td className="px-4 py-4">
                                                                <span className="text-xs font-medium text-slate-600 truncate max-w-[150px]">
                                                                    {log.entityType === 'user' ? '-' : (patientName || '-')}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {/* Cama - hidden in compact */}
                                                        {!compactView && (
                                                            <td className="px-4 py-4">
                                                                {log.entityType === 'user' || log.entityType === 'dailyRecord' ? (
                                                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                                                        {log.entityType === 'user' ? 'Sistema' : 'Registro'}
                                                                    </span>
                                                                ) : bedId ? (
                                                                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                                                        <MapPin size={12} className="text-slate-400" />
                                                                        {bedId}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                    {/* Grouped Details (Area 6) */}
                                                    {(log as any).isGroup && expandedRows.has(log.id) && (
                                                        <tr className="bg-amber-50/10">
                                                            <td colSpan={compactView ? 4 : 7} className="px-12 py-4 border-l-4 border-amber-500/30">
                                                                <div className="space-y-3">
                                                                    <h5 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                                                                        <LayoutGrid size={12} />
                                                                        Detalle de acciones agrupadas
                                                                    </h5>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                                        {(log as any).childLogs.map((child: AuditLogEntry) => (
                                                                            <div key={child.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1 hover:border-amber-200 transition-colors">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                                                                                        {formatTimestamp(child.timestamp).split(' ')[1]}
                                                                                    </span>
                                                                                    {(child.details?.bedId || child.entityType === 'patient') && (
                                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                                                                            Cama {String(child.details?.bedId || child.entityId)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                                                                    {child.summary || renderHumanDetails(child)}
                                                                                </p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {/* EXPANSIBLE DETAILS (Individual or first of group) */}
                                                    {!(log as any).isGroup && expandedRows.has(log.id) && (
                                                        <tr className="bg-slate-50/50">
                                                            <td colSpan={compactView ? 4 : 7} className="px-12 py-6 border-l-4 border-indigo-500/30">
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center justify-between">
                                                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                                            <FileText size={16} className="text-indigo-500" />
                                                                            <div className="flex flex-col">
                                                                                <span>{renderHumanDetails(log)}</span>
                                                                                {log.authors && (
                                                                                    <span className="text-[10px] font-medium text-slate-400 italic">
                                                                                        Responsables: {log.authors}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </h4>
                                                                    </div>

                                                                    {/* Comparison / Diff View (NEW) */}
                                                                    {(log.action.includes('MODIFIED') || (log.details?.changes as any)) && (
                                                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                                            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Comparación de Cambios</span>
                                                                                <GitBranch size={12} className="text-slate-400" />
                                                                            </div>
                                                                            <div className="p-0 overflow-x-auto">
                                                                                <table className="w-full text-[10px]">
                                                                                    <thead>
                                                                                        <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                                                                                            <th className="px-4 py-2 text-left font-bold">Campo</th>
                                                                                            <th className="px-4 py-2 text-left font-bold bg-rose-50/30 text-rose-700">Valor Anterior</th>
                                                                                            <th className="px-4 py-2 text-left font-bold bg-emerald-50/30 text-emerald-700">Valor Nuevo</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-slate-100">
                                                                                        {(() => {
                                                                                            const details = log.details as any;
                                                                                            const changes = details.changes || {};
                                                                                            const rows = [];

                                                                                            // Direct changes object (prefered)
                                                                                            if (Object.keys(changes).length > 0) {
                                                                                                for (const field in changes) {
                                                                                                    rows.push({
                                                                                                        field,
                                                                                                        old: changes[field].old,
                                                                                                        new: changes[field].new
                                                                                                    });
                                                                                                }
                                                                                            }
                                                                                            // Legacy / simple old vs new
                                                                                            else if (details.oldData || details.newData) {
                                                                                                const oldData = details.oldData || {};
                                                                                                const newData = details.newData || {};
                                                                                                const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

                                                                                                allKeys.forEach(key => {
                                                                                                    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                                                                                                        rows.push({
                                                                                                            field: key,
                                                                                                            old: oldData[key],
                                                                                                            new: newData[key]
                                                                                                        });
                                                                                                    }
                                                                                                });
                                                                                            }

                                                                                            if (rows.length === 0) {
                                                                                                return (
                                                                                                    <tr>
                                                                                                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                                                                                                            No se detectaron cambios estructurales registrados en el log técnico.
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                );
                                                                                            }

                                                                                            return rows.map((row, i) => (
                                                                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                                                    <td className="px-4 py-2 font-bold text-slate-700 capitalize">{row.field}</td>
                                                                                                    <td className="px-4 py-2 text-rose-600 bg-rose-50/10 font-mono">
                                                                                                        {typeof row.old === 'object' ? JSON.stringify(row.old) : String(row.old || '-')}
                                                                                                    </td>
                                                                                                    <td className="px-4 py-2 text-emerald-600 bg-emerald-50/10 font-bold font-mono">
                                                                                                        {typeof row.new === 'object' ? JSON.stringify(row.new) : String(row.new || '-')}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ));
                                                                                        })()}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex items-center justify-end">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const newSet = new Set(showMetadata);
                                                                                if (newSet.has(log.id)) newSet.delete(log.id);
                                                                                else newSet.add(log.id);
                                                                                setShowMetadata(newSet);
                                                                            }}
                                                                            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-colors shadow-sm"
                                                                        >
                                                                            <Activity size={12} />
                                                                            {showMetadata.has(log.id) ? 'Ocultar Metadata' : 'Ver Metadata Técnica'}
                                                                        </button>
                                                                    </div>

                                                                    {showMetadata.has(log.id) && (
                                                                        <div className="bg-slate-900 p-4 rounded-xl shadow-inner font-mono text-[10px] leading-relaxed overflow-x-auto text-sky-400">
                                                                            <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                                                                                <AlertCircle size={12} />
                                                                                <span className="uppercase tracking-widest font-bold">Detalles Técnicos / Sistema</span>
                                                                            </div>
                                                                            <pre className="opacity-90">
                                                                                {JSON.stringify(log.details || {}, null, 2)}
                                                                            </pre>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex gap-6 pt-2 flex-wrap">
                                                                        <div>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID Registro</p>
                                                                            <p className="text-[10px] text-slate-400 font-mono mt-1">{log.id}</p>
                                                                        </div>
                                                                        {log.patientIdentifier && (
                                                                            <div>
                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">RUT Paciente</p>
                                                                                <p className="text-[10px] text-slate-600 font-mono mt-1">{log.patientIdentifier}</p>
                                                                            </div>
                                                                        )}
                                                                        {log.ipAddress && (
                                                                            <div>
                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">IP Usuario</p>
                                                                                <p className="text-[10px] text-slate-600 font-mono mt-1">{log.ipAddress}</p>
                                                                            </div>
                                                                        )}
                                                                        {log.userUid && (
                                                                            <div>
                                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Firebase UID</p>
                                                                                <p className="text-[10px] text-slate-400 font-mono mt-1">{log.userUid}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }


            {/* Pagination / Total info */}
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium px-2 py-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Mostrando {paginatedLogs.length} de {filteredLogs.length} filtrados ({logs.length} totales)
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
                        >
                            ← Anterior
                        </button>
                        <span className="text-slate-700 font-bold">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-4 italic text-slate-400">
                    <AlertCircle size={14} />
                    Los registros de auditoría son de solo lectura y no pueden ser modificados.
                </div>
            </div>
            {/* Compliance Modal */}
            {
                showComplianceInfo && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-slate-200">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <Info className="text-indigo-600" size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Enfoque de Auditoría y Cumplimiento MINSAL</h3>
                                </div>
                                <button
                                    onClick={() => setShowComplianceInfo(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8 overflow-y-auto text-sm text-slate-600 leading-relaxed font-sans">
                                <div className="space-y-6">
                                    <section>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Marco Legal</h4>
                                        <p>El sistema se alinea con la <strong>Ley 20.584</strong> y la Norma Técnica de Ficha Clínica Electrónica, asegurando trazabilidad total e integridad de los datos.</p>
                                    </section>

                                    <section>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Trazabilidad de Visualización</h4>
                                        <p>Para cumplir con las exigencias de confianza clínica, el sistema registra obligatoriamente el acceso a:</p>
                                        <ul className="list-disc ml-5 mt-2 space-y-1 text-slate-500">
                                            <li>Entrega de Turno Médica (Evoluciones y Diagnósticos).</li>
                                            <li>Entrega de Turno Enfermería (Notas de Cuidados).</li>
                                            <li>Evaluación CUDYR (Categorización de riesgo).</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Protección de Datos</h4>
                                        <p>Cada registro captura el correo electrónico del usuario, marcas de tiempo inmutables y metadata de contexto técnico para asegurar la validez legal del rastro ante procesos médico-legales o acreditaciones.</p>
                                    </section>

                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3 mt-4">
                                        <CheckCircle2 className="text-emerald-500 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-xs font-bold text-emerald-800">Estado de los Registros</p>
                                            <p className="text-[11px] text-emerald-600 mt-1">Los datos aquí mostrados son de solo lectura y están protegidos contra cualquier intento de modificación o borrado accidental.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                                <button
                                    onClick={() => setShowComplianceInfo(false)}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

