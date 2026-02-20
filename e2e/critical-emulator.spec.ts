import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const CURRENT_DATE = process.env.E2E_FIXED_DATE ?? '2026-01-01';
const FIXED_LAST_UPDATED = `${CURRENT_DATE}T00:00:00.000Z`;

const USERS = {
  editor: {
    uid: 'e2e-critical-editor',
    email: 'hospitalizados@hospitalhangaroa.cl',
    displayName: 'E2E Critical Editor',
    role: 'nurse_hospital',
  },
  viewer: {
    uid: 'e2e-critical-viewer',
    email: 'd.opazo.damiani@gmail.com',
    displayName: 'E2E Critical Viewer',
    role: 'doctor_urgency',
  },
} as const;

const BEDS_IDS = [
  'R1',
  'R2',
  'R3',
  'R4',
  'NEO1',
  'NEO2',
  'H1C1',
  'H1C2',
  'H2C1',
  'H2C2',
  'H3C1',
  'H3C2',
  'H4C1',
  'H4C2',
  'H5C1',
  'H5C2',
  'H6C1',
  'H6C2',
  'E1',
  'E2',
  'E3',
  'E4',
  'E5',
] as const;

const getPatientNameInput = (page: Page) =>
  page.locator('tr:has-text("R1") input[name="patientName"]').first();

const bootstrapCensusSession = async (page: Page, role: keyof typeof USERS) => {
  const user = USERS[role];

  await page.addInitScript(
    ({
      bootstrapUser,
      dateStr,
      beds,
    }: {
      bootstrapUser: (typeof USERS)[keyof typeof USERS];
      dateStr: string;
      beds: readonly string[];
    }) => {
      const buildRecord = () => {
        const record: Record<string, unknown> = {
          date: dateStr,
          beds: {},
          discharges: [],
            transfers: [],
            cma: [],
            lastUpdated: FIXED_LAST_UPDATED,
            nurses: ['E2E Nurse'],
            activeExtraBeds: [],
            schemaVersion: 1,
        };

        const bedsMap = record.beds as Record<string, Record<string, unknown>>;

        beds.forEach((bedId, index) => {
          bedsMap[bedId] = {
            id: bedId,
            bedId,
            patientName: bedId === 'R1' ? 'PACIENTE E2E' : '',
            rut: bedId === 'R1' ? '12.345.678-5' : '',
            age: bedId === 'R1' ? '45a' : '',
            pathology: bedId === 'R1' ? 'DIAGNOSTICO E2E' : '',
            specialty: bedId === 'R1' ? 'Medicina' : '',
            status: 'ESTABLE',
            bedMode: index < 4 ? 'Adulto' : 'Pediatrico',
            isBlocked: false,
            hasCompanionCrib: false,
            devices: [],
            admissionDate: dateStr,
            isNewborn: false,
            isPCR: false,
            hasWristband: false,
            surgicalComplication: false,
            isUPC: false,
          };
        });

        return record;
      };

      const existing = JSON.parse(localStorage.getItem('hanga_roa_hospital_data') || '{}');
      if (!existing[dateStr]) {
        existing[dateStr] = buildRecord();
      }
      const record = existing[dateStr];
      localStorage.setItem('hanga_roa_hospital_data', JSON.stringify(existing));
      localStorage.setItem('hhr_offline_user', JSON.stringify(bootstrapUser));

      window.__HHR_E2E_OVERRIDE__ = {
        ...(window.__HHR_E2E_OVERRIDE__ || {}),
        [dateStr]: record,
      };
    },
    { bootstrapUser: user, dateStr: CURRENT_DATE, beds: BEDS_IDS }
  );

  await page.goto(`/censo?date=${CURRENT_DATE}`);
  await expect(page.locator('table')).toBeVisible({ timeout: 15_000 });
};

test.describe('Critical Census Flows (Firestore emulator-backed runtime)', () => {
  test('renders census table and allows basic editing', async ({ page }) => {
    await bootstrapCensusSession(page, 'editor');

    const input = getPatientNameInput(page);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    const newValue = 'E2E_CRITICAL_VALUE';
    await input.fill(newValue);
    await input.blur();
    await expect(input).toHaveValue(new RegExp(newValue, 'i'));
  });

  test('stays interactive across offline -> online transitions', async ({ page, context }) => {
    await bootstrapCensusSession(page, 'editor');

    const input = getPatientNameInput(page);
    await expect(input).toBeVisible();

    const offlineValue = 'OFFLINE_VALUE';
    await input.fill(offlineValue);
    await input.blur();
    await expect(input).toHaveValue(new RegExp(offlineValue, 'i'));

    await context.setOffline(true);
    await page.waitForTimeout(800);

    const changedWhileOffline = `${offlineValue}_CHANGED`;
    await input.fill(changedWhileOffline);
    await input.blur();
    await expect(input).toHaveValue(new RegExp(changedWhileOffline, 'i'));

    await context.setOffline(false);
    await page.waitForTimeout(1500);

    await expect(page.locator('table')).toBeVisible();
    await expect(input).toBeEnabled();
    await input.fill('ONLINE_RECOVERED');
    await input.blur();
    await expect(input).toHaveValue(/ONLINE_RECOVERED/i);
  });

  test('viewer role can load data but cannot edit critical fields', async ({ page }) => {
    await bootstrapCensusSession(page, 'viewer');

    const input = getPatientNameInput(page);
    await expect(input).toBeVisible();
    await expect(input).toBeDisabled();
  });
});
