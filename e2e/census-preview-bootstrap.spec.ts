import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page, type Route } from '@playwright/test';
import { buildCanonicalE2ERecord, MOCK_USERS } from './fixtures/auth';

type FirebasePreviewConfig = {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

const PREVIEW_BOOTSTRAP_DATE = process.env.E2E_FIXED_DATE ?? '2026-04-03';
const SEEDED_PATIENT_NAME = 'PACIENTE VALIDACION PREVIEW';

const parseDotEnvFile = (filePath: string): Record<string, string> => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf-8')
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        return acc;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
};

const loadPreviewFirebaseConfig = (): FirebasePreviewConfig => {
  const envFiles = ['.env.production', '.env', '.env.local'].map(file =>
    path.resolve(process.cwd(), file)
  );
  const mergedEnv = envFiles.reduce<Record<string, string>>(
    (acc, filePath) => ({ ...acc, ...parseDotEnvFile(filePath) }),
    {}
  );

  const apiKey = process.env.VITE_FIREBASE_API_KEY || mergedEnv.VITE_FIREBASE_API_KEY || '';
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID || mergedEnv.VITE_FIREBASE_PROJECT_ID || '';
  const appId = process.env.VITE_FIREBASE_APP_ID || mergedEnv.VITE_FIREBASE_APP_ID || '';

  if (!apiKey || !projectId || !appId) {
    throw new Error(
      'Preview Firebase config is incomplete. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_APP_ID for the local validation.'
    );
  }

  return {
    apiKey,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || mergedEnv.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket:
      process.env.VITE_FIREBASE_STORAGE_BUCKET || mergedEnv.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || mergedEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId,
  };
};

const seedPersistedSessionAndRecord = async (page: Page) => {
  const firebaseConfig = loadPreviewFirebaseConfig();
  const baseRecord = buildCanonicalE2ERecord(PREVIEW_BOOTSTRAP_DATE) as Record<string, unknown>;
  const baseBeds = baseRecord.beds as Record<string, Record<string, unknown>>;
  const seededRecord = buildCanonicalE2ERecord(PREVIEW_BOOTSTRAP_DATE, {
    beds: {
      ...baseBeds,
      R1: {
        ...baseBeds.R1,
        patientName: SEEDED_PATIENT_NAME,
        pathology: 'DIAGNOSTICO PREVIEW',
        age: '44',
        status: 'ESTABLE',
      },
    },
  });

  await page.route('**/.netlify/functions/firebase-config**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(firebaseConfig),
    });
  });

  await page.addInitScript(
    ({
      bootstrapUser,
      date,
      record,
      runtimeConfig,
    }: {
      bootstrapUser: unknown;
      date: string;
      record: unknown;
      runtimeConfig: FirebasePreviewConfig;
    }) => {
      const runtimeWindow = window as Window & { __HHR_E2E_OVERRIDE__?: Record<string, unknown> };
      runtimeWindow.__HHR_E2E_OVERRIDE__ = {
        ...(runtimeWindow.__HHR_E2E_OVERRIDE__ || {}),
        [date]: record,
      };

      localStorage.setItem('hhr_e2e_bootstrap_user', JSON.stringify(bootstrapUser));
      localStorage.setItem('firebase:authUser:test:[DEFAULT]', JSON.stringify({ uid: 'preview' }));
      localStorage.setItem('hhr_firebase_config', JSON.stringify(runtimeConfig));

      const existing = JSON.parse(localStorage.getItem('hanga_roa_hospital_data') || '{}');
      existing[date] = record;
      localStorage.setItem('hanga_roa_hospital_data', JSON.stringify(existing));
    },
    {
      bootstrapUser: MOCK_USERS.admin,
      date: PREVIEW_BOOTSTRAP_DATE,
      record: seededRecord,
      runtimeConfig: firebaseConfig,
    }
  );
};

const collectPreviewDiagnostics = async (page: Page, date: string) =>
  page.evaluate((targetDate: string) => {
    const runtimeWindow = window as Window & { __HHR_E2E_OVERRIDE__?: Record<string, unknown> };
    const persistedRecords = JSON.parse(localStorage.getItem('hanga_roa_hospital_data') || '{}');
    const telemetry = JSON.parse(localStorage.getItem('operationalTelemetryEvents') || '[]');

    return {
      href: window.location.href,
      overrideDates: Object.keys(runtimeWindow.__HHR_E2E_OVERRIDE__ || {}),
      overrideRecord: runtimeWindow.__HHR_E2E_OVERRIDE__?.[targetDate] || null,
      persistedRecordDates: Object.keys(persistedRecords),
      persistedRecord: persistedRecords[targetDate] || null,
      hasBootstrapUser: Boolean(localStorage.getItem('hhr_e2e_bootstrap_user')),
      hasFirebaseHint: Boolean(localStorage.getItem('firebase:authUser:test:[DEFAULT]')),
      telemetry: telemetry
        .filter(
          (event: { category?: string }) =>
            event?.category === 'daily_record' ||
            event?.category === 'indexeddb' ||
            event?.category === 'auth'
        )
        .slice(-20),
      pageTextSnippet: document.body.innerText.slice(0, 800),
    };
  }, date);

const expectSeededPatientVisible = async (page: Page) => {
  const seededPatientInput = page.locator(
    '[data-testid="patient-row"][data-bed-id="R1"] input[name="patientName"]'
  );

  try {
    await expect(seededPatientInput).toHaveValue(SEEDED_PATIENT_NAME, { timeout: 5000 });
  } catch (error) {
    const diagnostics = await collectPreviewDiagnostics(page, PREVIEW_BOOTSTRAP_DATE);
    test.info().attach('preview-bootstrap-diagnostics', {
      body: JSON.stringify(diagnostics, null, 2),
      contentType: 'application/json',
    });
    throw new Error(
      `Seeded preview patient was not visible.\nDiagnostics:\n${JSON.stringify(diagnostics, null, 2)}`,
      { cause: error }
    );
  }
};

test.describe('Production Preview Bootstrap', () => {
  test('loads persisted census state without falling into empty state after initial bootstrap', async ({
    page,
  }) => {
    await seedPersistedSessionAndRecord(page);

    await page.goto(`/?date=${PREVIEW_BOOTSTRAP_DATE}`);

    await expectSeededPatientVisible(page);
    await expect(page.getByTestId('view-loader')).toBeHidden({ timeout: 5000 });
    await expect(page.getByTestId('empty-day-prompt')).toHaveCount(0);
  });

  test('keeps the census record visible after a full reload with persisted client state', async ({
    page,
  }) => {
    await seedPersistedSessionAndRecord(page);

    await page.goto(`/?date=${PREVIEW_BOOTSTRAP_DATE}`);
    await expectSeededPatientVisible(page);

    await page.reload();

    await expectSeededPatientVisible(page);
    await expect(page.getByTestId('empty-day-prompt')).toHaveCount(0);
  });
});
