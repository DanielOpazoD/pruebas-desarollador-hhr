export const getValueAtPath = (source: unknown, path: string): unknown => {
  const parts = path.split('.');
  let cursor: unknown = source;

  for (const part of parts) {
    if (cursor == null) {
      return undefined;
    }
    if (Array.isArray(cursor)) {
      const index = Number(part);
      cursor = Number.isNaN(index) ? undefined : cursor[index];
      continue;
    }
    if (typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[part];
      continue;
    }
    return undefined;
  }

  return cursor;
};

export const normalizeChangedPaths = (changedPaths?: string[]): string[] => {
  if (!changedPaths || changedPaths.length === 0) return [];
  return Array.from(new Set(changedPaths.map(path => path.trim()).filter(Boolean)));
};

export const toMillis = (value: string | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toIso = (value: number): string => new Date(value || Date.now()).toISOString();

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const isPrimitive = (value: unknown): value is string | number | boolean =>
  ['string', 'number', 'boolean'].includes(typeof value);
