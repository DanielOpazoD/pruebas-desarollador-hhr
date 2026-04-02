export const deepClone = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};
