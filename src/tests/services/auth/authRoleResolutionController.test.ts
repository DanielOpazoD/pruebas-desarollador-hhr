import { describe, expect, it, vi } from 'vitest';

import { resolveAllowedRoleForEmail } from '@/services/auth/authRoleResolutionController';

describe('authRoleResolutionController', () => {
  const createDependencies = () => ({
    getStaticRoleForEmail: vi.fn().mockReturnValue(null),
    getCachedRole: vi.fn().mockResolvedValue(null),
    getCloudRoleForEmail: vi.fn().mockResolvedValue(null),
    getDynamicRoleForEmail: vi.fn().mockResolvedValue(null),
    getAllowedUserRoleForEmail: vi.fn().mockResolvedValue(null),
    saveRoleToCache: vi.fn(),
  });

  it('returns the first matching static role and caches it', async () => {
    const dependencies = createDependencies();
    dependencies.getStaticRoleForEmail.mockReturnValue('admin');

    const result = await resolveAllowedRoleForEmail('test@hospital.cl', dependencies);

    expect(result).toEqual({ role: 'admin', source: 'static' });
    expect(dependencies.saveRoleToCache).toHaveBeenCalledWith('test@hospital.cl', 'admin');
    expect(dependencies.getCachedRole).not.toHaveBeenCalled();
  });

  it('prefers dynamic Firestore roles before cloud role fallback', async () => {
    const dependencies = createDependencies();
    dependencies.getDynamicRoleForEmail.mockResolvedValue('doctor_specialist');
    dependencies.getCloudRoleForEmail.mockResolvedValue('doctor_urgency');

    const result = await resolveAllowedRoleForEmail('test@hospital.cl', dependencies);

    expect(result).toEqual({ role: 'doctor_specialist', source: 'dynamic' });
    expect(dependencies.getCloudRoleForEmail).not.toHaveBeenCalled();
  });

  it('returns none when no lookup resolves a role', async () => {
    const dependencies = createDependencies();

    const result = await resolveAllowedRoleForEmail('test@hospital.cl', dependencies);

    expect(result).toEqual({ role: null, source: 'none' });
  });
});
