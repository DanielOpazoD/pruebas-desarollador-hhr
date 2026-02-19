import { DailyRecord, DailyRecordPatch, PatientData } from '@/types';
import { applyPatches } from '@/utils/patchUtils';
import {
  RECORD_STRUCTURAL_FIELDS,
  selectScalarByPolicy,
} from '@/services/repositories/conflictResolutionPolicy';
import {
  getValueAtPath,
  isPlainObject,
  isPrimitive,
  normalizeChangedPaths,
  toIso,
  toMillis,
} from '@/services/repositories/conflictResolutionUtils';

interface ConflictResolutionOptions {
  changedPaths?: string[];
}

const ID_BASED_ARRAY_FIELDS = new Set(['discharges', 'transfers', 'cma']);
const UNIQUE_ARRAY_FIELDS = new Set([
  'nurses',
  'nursesDayShift',
  'nursesNightShift',
  'tensDayShift',
  'tensNightShift',
  'activeExtraBeds',
]);
const PATIENT_ID_ARRAY_FIELDS = new Set(['clinicalEvents', 'deviceInstanceHistory']);
const PATIENT_UNIQUE_ARRAY_FIELDS = new Set(['devices']);

export const resolveDailyRecordConflict = (
  remote: DailyRecord,
  local: DailyRecord,
  options: ConflictResolutionOptions = {}
): DailyRecord => {
  const changedPaths = normalizeChangedPaths(options.changedPaths);
  if (changedPaths.length === 0 || changedPaths.includes('*')) {
    return resolveWholeRecord(remote, local);
  }
  return resolveByChangedPaths(remote, local, changedPaths);
};

const resolveWholeRecord = (remote: DailyRecord, local: DailyRecord): DailyRecord => {
  const localTs = toMillis(local.lastUpdated);
  const remoteTs = toMillis(remote.lastUpdated);
  const preferLocal = localTs >= remoteTs;
  const preferred = preferLocal ? local : remote;
  const secondary = preferLocal ? remote : local;

  const resolved: DailyRecord = {
    ...secondary,
    ...preferred,
    date: remote.date || local.date,
    beds: mergeBeds(remote.beds, local.beds, preferLocal),
    discharges: mergeArrayById(remote.discharges, local.discharges),
    transfers: mergeArrayById(remote.transfers, local.transfers),
    cma: mergeArrayById(remote.cma, local.cma),
    nurses: mergeUniquePrimitiveArray(remote.nurses, local.nurses, preferLocal),
    nursesDayShift: mergeUniquePrimitiveArray(
      remote.nursesDayShift || [],
      local.nursesDayShift || [],
      preferLocal
    ),
    nursesNightShift: mergeUniquePrimitiveArray(
      remote.nursesNightShift || [],
      local.nursesNightShift || [],
      preferLocal
    ),
    tensDayShift: mergeUniquePrimitiveArray(
      remote.tensDayShift || [],
      local.tensDayShift || [],
      preferLocal
    ),
    tensNightShift: mergeUniquePrimitiveArray(
      remote.tensNightShift || [],
      local.tensNightShift || [],
      preferLocal
    ),
    activeExtraBeds: mergeUniquePrimitiveArray(
      remote.activeExtraBeds || [],
      local.activeExtraBeds || [],
      preferLocal
    ),
    handoffDayChecklist: mergeObject(
      remote.handoffDayChecklist as unknown as Record<string, unknown> | undefined,
      local.handoffDayChecklist as unknown as Record<string, unknown> | undefined,
      preferLocal
    ) as DailyRecord['handoffDayChecklist'],
    handoffNightChecklist: mergeObject(
      remote.handoffNightChecklist as unknown as Record<string, unknown> | undefined,
      local.handoffNightChecklist as unknown as Record<string, unknown> | undefined,
      preferLocal
    ) as DailyRecord['handoffNightChecklist'],
    medicalSignature: mergeObject(
      remote.medicalSignature as unknown as Record<string, unknown> | undefined,
      local.medicalSignature as unknown as Record<string, unknown> | undefined,
      preferLocal
    ) as DailyRecord['medicalSignature'],
    lastUpdated: toIso(Math.max(remoteTs, localTs)),
  };

  const remoteRecord = remote as unknown as Record<string, unknown>;
  const localRecord = local as unknown as Record<string, unknown>;
  const scalarKeys = new Set([...Object.keys(remoteRecord), ...Object.keys(localRecord)]);
  scalarKeys.forEach(key => {
    if (RECORD_STRUCTURAL_FIELDS.has(key)) return;
    (resolved as unknown as Record<string, unknown>)[key] = selectScalarByPolicy(
      key,
      remoteRecord[key],
      localRecord[key],
      preferLocal
    );
  });

  return resolved;
};

const resolveByChangedPaths = (
  remote: DailyRecord,
  local: DailyRecord,
  changedPaths: string[]
): DailyRecord => {
  const patches: DailyRecordPatch = {};

  for (const path of changedPaths) {
    if (path === '*') {
      return resolveWholeRecord(remote, local);
    }

    const [root, second, third] = path.split('.');

    if (root === 'beds') {
      if (!second) {
        (patches as Record<string, unknown>).beds = mergeBeds(remote.beds, local.beds, true);
        continue;
      }

      if (!third) {
        const remoteBed = remote.beds[second];
        const localBed = local.beds[second];
        (patches as Record<string, unknown>)[`beds.${second}`] = mergePatientData(
          remoteBed,
          localBed,
          true
        );
        continue;
      }

      const patchValue = resolvePathValueWithMatrix(remote, local, path);
      (patches as Record<string, unknown>)[path] = patchValue;
      continue;
    }

    if (ID_BASED_ARRAY_FIELDS.has(root)) {
      const remoteMap = remote as unknown as Record<string, unknown>;
      const localMap = local as unknown as Record<string, unknown>;
      (patches as Record<string, unknown>)[root] = mergeArrayById(
        remoteMap[root] as unknown[],
        localMap[root] as unknown[]
      );
      continue;
    }

    if (UNIQUE_ARRAY_FIELDS.has(root)) {
      const remoteMap = remote as unknown as Record<string, unknown>;
      const localMap = local as unknown as Record<string, unknown>;
      (patches as Record<string, unknown>)[root] = mergeUniquePrimitiveArray(
        (remoteMap[root] as string[]) || [],
        (localMap[root] as string[]) || [],
        true
      );
      continue;
    }

    (patches as Record<string, unknown>)[path] = selectScalarByPolicy(
      path,
      getValueAtPath(remote, path),
      getValueAtPath(local, path),
      true
    );
  }

  const merged = applyPatches(remote, patches);
  merged.lastUpdated = toIso(Math.max(toMillis(remote.lastUpdated), toMillis(local.lastUpdated)));
  return merged;
};

const resolvePathValueWithMatrix = (
  remote: DailyRecord,
  local: DailyRecord,
  path: string
): unknown => {
  const parts = path.split('.');
  const bedId = parts[1];
  const patientField = parts[2];

  if (!bedId || !patientField) {
    return selectScalarByPolicy(
      path,
      getValueAtPath(remote, path),
      getValueAtPath(local, path),
      true
    );
  }

  if (PATIENT_ID_ARRAY_FIELDS.has(patientField)) {
    return mergeArrayById(
      getValueAtPath(remote, path) as unknown[],
      getValueAtPath(local, path) as unknown[]
    );
  }

  if (PATIENT_UNIQUE_ARRAY_FIELDS.has(patientField)) {
    return mergeUniquePrimitiveArray(
      (getValueAtPath(remote, path) as string[]) || [],
      (getValueAtPath(local, path) as string[]) || [],
      true
    );
  }

  return selectScalarByPolicy(
    path,
    getValueAtPath(remote, path),
    getValueAtPath(local, path),
    true
  );
};

const mergeBeds = (
  remoteBeds: Record<string, PatientData>,
  localBeds: Record<string, PatientData>,
  preferLocal: boolean
): Record<string, PatientData> => {
  const merged: Record<string, PatientData> = {};
  const bedIds = new Set([...Object.keys(remoteBeds || {}), ...Object.keys(localBeds || {})]);

  bedIds.forEach(bedId => {
    merged[bedId] = mergePatientData(
      remoteBeds?.[bedId],
      localBeds?.[bedId],
      preferLocal,
      `beds.${bedId}`
    );
  });

  return merged;
};

const mergePatientData = (
  remotePatient: PatientData | undefined,
  localPatient: PatientData | undefined,
  preferLocal: boolean,
  pathPrefix = 'beds'
): PatientData => {
  if (!remotePatient && localPatient) return localPatient;
  if (!localPatient && remotePatient) return remotePatient;
  if (!remotePatient && !localPatient) {
    return {} as PatientData;
  }

  const remoteRecord = remotePatient as unknown as Record<string, unknown>;
  const localRecord = localPatient as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(remoteRecord), ...Object.keys(localRecord)]);

  keys.forEach(key => {
    const remoteValue = remoteRecord[key];
    const localValue = localRecord[key];

    if (PATIENT_ID_ARRAY_FIELDS.has(key)) {
      merged[key] = mergeArrayById(
        (remoteValue as unknown[]) || [],
        (localValue as unknown[]) || []
      );
      return;
    }

    if (PATIENT_UNIQUE_ARRAY_FIELDS.has(key)) {
      merged[key] = mergeUniquePrimitiveArray(
        (remoteValue as string[]) || [],
        (localValue as string[]) || [],
        preferLocal
      );
      return;
    }

    if (key === 'clinicalCrib') {
      merged[key] = mergePatientData(
        remoteValue as PatientData | undefined,
        localValue as PatientData | undefined,
        preferLocal,
        `${pathPrefix}.${key}`
      );
      return;
    }

    merged[key] = mergeUnknown(remoteValue, localValue, preferLocal, `${pathPrefix}.${key}`);
  });

  return merged as unknown as PatientData;
};

const mergeUnknown = (
  remote: unknown,
  local: unknown,
  preferLocal: boolean,
  path = ''
): unknown => {
  if (Array.isArray(remote) || Array.isArray(local)) {
    const remoteArray = Array.isArray(remote) ? remote : [];
    const localArray = Array.isArray(local) ? local : [];
    if (remoteArray.length > 0 && typeof remoteArray[0] === 'object') {
      return mergeArrayById(remoteArray, localArray);
    }
    return mergeUniquePrimitiveArray(
      remoteArray.filter(isPrimitive).map(String),
      localArray.filter(isPrimitive).map(String),
      preferLocal
    );
  }

  if (isPlainObject(remote) || isPlainObject(local)) {
    return mergeObject(
      (isPlainObject(remote) ? remote : {}) as Record<string, unknown>,
      (isPlainObject(local) ? local : {}) as Record<string, unknown>,
      preferLocal,
      path
    );
  }
  return selectScalarByPolicy(path, remote, local, preferLocal);
};

const mergeObject = (
  remote: Record<string, unknown> | undefined,
  local: Record<string, unknown> | undefined,
  preferLocal: boolean,
  pathPrefix = ''
): Record<string, unknown> | undefined => {
  if (!remote && !local) return undefined;
  if (!remote) return local;
  if (!local) return remote;

  const result: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);

  keys.forEach(key => {
    const childPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    result[key] = mergeUnknown(remote[key], local[key], preferLocal, childPath);
  });

  return result;
};

const mergeArrayById = <T>(remote: T[] = [], local: T[] = []): T[] => {
  const output = new Map<string, T>();
  const sequence: string[] = [];

  const append = (item: T) => {
    const id = resolveItemId(item);
    if (!output.has(id)) {
      sequence.push(id);
    }
    output.set(id, item);
  };

  remote.forEach(append);
  local.forEach(append);

  return sequence.map(id => output.get(id) as T);
};

const mergeUniquePrimitiveArray = (
  remote: string[] = [],
  local: string[] = [],
  preferLocal: boolean
): string[] => {
  const preferred = preferLocal ? local : remote;
  const secondary = preferLocal ? remote : local;
  return Array.from(new Set([...(preferred || []), ...(secondary || [])]));
};

const resolveItemId = (item: unknown): string => {
  if (item && typeof item === 'object' && 'id' in item) {
    return String((item as { id?: string | number }).id ?? JSON.stringify(item));
  }
  return JSON.stringify(item);
};
