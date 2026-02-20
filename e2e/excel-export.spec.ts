/**
 * E2E Tests: Export Actions
 * Validates current export entrypoints in Census UI with deterministic bootstrap.
 */

import { test, expect } from '@playwright/test';

const E2E_DATE = '2026-02-20';

const bootstrapCensusSession = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(({ dateStr }) => {
    const user = {
      uid: 'e2e-export-user',
      email: 'hospitalizados@hospitalhangaroa.cl',
      displayName: 'E2E Export User',
      role: 'admin',
    };

    const existing = JSON.parse(localStorage.getItem('hanga_roa_hospital_data') || '{}');
    if (!existing[dateStr]) {
      existing[dateStr] = {
        date: dateStr,
        beds: {
          R1: {
            id: 'R1',
            bedId: 'R1',
            patientName: '',
            rut: '',
            age: '',
            pathology: '',
            specialty: '',
            status: 'ESTABLE',
            admissionDate: dateStr,
            devices: [],
            isBlocked: false,
            isUPC: false,
          },
        },
        discharges: [],
        transfers: [],
        cma: [],
        nurses: ['', ''],
        nursesDayShift: ['', ''],
        nursesNightShift: ['', ''],
        tensDayShift: ['', ''],
        tensNightShift: ['', ''],
        lastUpdated: `${dateStr}T12:00:00.000Z`,
        activeExtraBeds: [],
        schemaVersion: 1,
      };
    }

    localStorage.setItem('hanga_roa_hospital_data', JSON.stringify(existing));
    localStorage.setItem('hhr_offline_user', JSON.stringify(user));

    (window as Window & { __HHR_E2E_OVERRIDE__?: Record<string, unknown> }).__HHR_E2E_OVERRIDE__ = {
      [dateStr]: existing[dateStr],
    };
  }, { dateStr: E2E_DATE });

  await page.goto(`/censo?date=${E2E_DATE}`);
  await expect(page.locator('main table').first()).toBeVisible({ timeout: 20000 });
};

const openSaveDropdown = async (page: import('@playwright/test').Page) => {
  const saveButton = page.getByRole('button', { name: /guardar|guardado|archivado/i }).first();
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.evaluate((element: HTMLElement) => element.click());
};

const openSendDropdown = async (page: import('@playwright/test').Page) => {
  const sendButton = page.getByRole('button', { name: /enviar censo/i }).first();
  await expect(sendButton).toBeVisible({ timeout: 10000 });
  await sendButton.evaluate((element: HTMLElement) => element.click());
};

test.describe('Export actions in Census', () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapCensusSession(page);
  });

  test('shows local Excel export option in Save dropdown', async ({ page }) => {
    await openSaveDropdown(page);
    await expect(page.getByText('Descargar Local', { exact: false })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Exportar planilla Excel', { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('shows email Excel option in Send dropdown', async ({ page }) => {
    await openSendDropdown(page);
    await expect(page.getByText('Enviar Archivo Excel', { exact: false })).toBeVisible({ timeout: 10000 });
  });

  test('can trigger local Excel action without breaking view', async ({ page }) => {
    await openSaveDropdown(page);
    await page.getByText('Descargar Local', { exact: false }).click();
    await expect(page.locator('main table').first()).toBeVisible({ timeout: 10000 });
  });
});
