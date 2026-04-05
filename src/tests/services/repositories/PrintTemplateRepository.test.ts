import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocMock = vi.fn();
const setDocMock = vi.fn();
const onSnapshotMock = vi.fn();
const docMock = vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => docMock(_db, ...segments),
  getDoc: (ref: unknown) => getDocMock(ref),
  setDoc: (ref: unknown, data: unknown) => setDocMock(ref, data),
  onSnapshot: (ref: unknown, next: unknown, error: unknown) => onSnapshotMock(ref, next, error),
}));

vi.mock('@/firebaseConfig', () => ({
  db: {},
}));

vi.mock('@/constants/firestorePaths', () => ({
  COLLECTIONS: { HOSPITALS: 'hospitals' },
  HOSPITAL_COLLECTIONS: { PRINT_TEMPLATES: 'printTemplates' },
  getActiveHospitalId: () => 'hospital-test',
}));

import { PrintTemplateRepository } from '@/services/repositories/PrintTemplateRepository';
import { createPrintTemplateRepository } from '@/services/repositories/PrintTemplateRepository';

describe('PrintTemplateRepository', () => {
  const injectedRepository = createPrintTemplateRepository({ getDb: () => ({}) as never });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when getTemplate fails', async () => {
    getDocMock.mockRejectedValue(new Error('firestore down'));

    await expect(PrintTemplateRepository.getTemplate('handoff-lite')).resolves.toBeNull();
  });

  it('saves template with updated timestamp', async () => {
    setDocMock.mockResolvedValue(undefined);

    await PrintTemplateRepository.saveTemplate({
      id: 'handoff-lite',
      name: 'Handoff Lite',
      sections: [],
      page: {
        format: 'a4',
        orientation: 'portrait',
        marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
      },
      table: { fontSize: 10, lineHeight: 1.2, zebra: false, borders: true },
    } as never);

    expect(setDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'handoff-lite',
        lastUpdated: expect.any(String),
      })
    );
  });

  it('falls back to null on subscription error', async () => {
    const callback = vi.fn();
    const unsubscribe = vi.fn();
    onSnapshotMock.mockImplementation((_ref, _next, errorHandler) => {
      errorHandler(new Error('subscription failed'));
      return unsubscribe;
    });

    const result = PrintTemplateRepository.subscribe('handoff-lite', callback);

    await waitFor(() => {
      expect(callback).toHaveBeenCalledWith(null);
    });
    result();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('supports injected runtime for template persistence', async () => {
    setDocMock.mockResolvedValue(undefined);

    await injectedRepository.saveTemplate({
      id: 'handoff-injected',
      name: 'Injected',
      sections: [],
      page: {
        format: 'a4',
        orientation: 'portrait',
        marginsMm: { top: 10, right: 10, bottom: 10, left: 10 },
      },
      table: { fontSize: 10, lineHeight: 1.2, zebra: false, borders: true },
    } as never);

    expect(docMock).toHaveBeenCalledWith(
      expect.anything(),
      'hospitals',
      'hospital-test',
      'printTemplates',
      'handoff-injected'
    );
  });
});
