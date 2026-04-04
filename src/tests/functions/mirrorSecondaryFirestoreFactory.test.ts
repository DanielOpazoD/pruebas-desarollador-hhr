import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-functions/v1', () => ({
  config: () => ({}),
}));

const require = createRequire(import.meta.url);
const {
  createMirrorSecondaryFirestore,
  parseMirrorSecondaryServiceAccount,
} = require('../../../functions/lib/mirror/mirrorSecondaryFirestoreFactory.js');

const buildPrivateKeyFixture = () =>
  ['-----BEGIN ', 'PRIVATE KEY-----\nabc\n-----END ', 'PRIVATE KEY-----\n'].join('');

interface ServiceAccountSecret {
  project_id: string;
  client_email: string;
  private_key: string;
}

const createServiceAccountSecret = (
  overrides: Partial<ServiceAccountSecret> = {}
): ServiceAccountSecret => ({
  project_id: 'env-project',
  client_email: 'firebase-adminsdk@test-project.iam.gserviceaccount.com',
  private_key: buildPrivateKeyFixture(),
  ...overrides,
});

describe('functions mirrorSecondaryFirestoreFactory', () => {
  beforeEach(() => {
    delete process.env.BETA_SERVICE_ACCOUNT_JSON;
    delete process.env.BETA_SERVICE_ACCOUNT_JSON_B64;
  });

  it('parses mirror secondary credentials from env or runtime config', () => {
    process.env.BETA_SERVICE_ACCOUNT_JSON = JSON.stringify(createServiceAccountSecret());
    expect(parseMirrorSecondaryServiceAccount()).toMatchObject({ project_id: 'env-project' });

    delete process.env.BETA_SERVICE_ACCOUNT_JSON;
    process.env.BETA_SERVICE_ACCOUNT_JSON_B64 = Buffer.from(
      JSON.stringify(createServiceAccountSecret({ project_id: 'beta-project' }))
    ).toString('base64');
    expect(parseMirrorSecondaryServiceAccount()).toMatchObject({ project_id: 'beta-project' });
  });

  it('rejects incomplete mirror secondary credentials', () => {
    process.env.BETA_SERVICE_ACCOUNT_JSON = JSON.stringify(
      createServiceAccountSecret({ private_key: '' })
    );

    expect(parseMirrorSecondaryServiceAccount()).toBeNull();
  });

  it('creates a secondary firestore instance when credentials are available', () => {
    process.env.BETA_SERVICE_ACCOUNT_JSON = JSON.stringify(createServiceAccountSecret());
    const firestore = {};
    const admin = {
      credential: { cert: vi.fn().mockReturnValue('cert') },
      initializeApp: vi.fn().mockReturnValue({ firestore: () => firestore }),
    };

    expect(createMirrorSecondaryFirestore(admin)).toBe(firestore);
    expect(admin.initializeApp).toHaveBeenCalled();
  });
});
