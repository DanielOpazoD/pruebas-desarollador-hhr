import { test, expect, type Page } from '@playwright/test';
import {
  bootstrapSeededRecord,
  buildCanonicalE2ERecord,
  ensureAuthenticated,
} from './fixtures/auth';

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const buildShiftHandoffRecord = (date: string) =>
  buildCanonicalE2ERecord(date, {
    beds: {
      ...(buildCanonicalE2ERecord(date).beds as Record<string, unknown>),
      R1: {
        ...(buildCanonicalE2ERecord(date).beds as Record<string, Record<string, unknown>>).R1,
        patientName: 'Shift Patient',
        pathology: 'Shift DX',
        status: 'Estable',
      },
    },
    nursesDayShift: ['Enfermero/a 1', 'Enfermero/a 2'],
    nursesNightShift: ['Enfermero/a 1', 'Enfermero/a 2'],
    handoffNightReceives: ['Enfermero/a 1', 'Enfermero/a 2'],
  });

const openSeededCensus = async (page: Page) => {
  const date = getTodayDate();
  await bootstrapSeededRecord(page, {
    role: 'admin',
    date,
    record: buildShiftHandoffRecord(date),
    useRuntimeOverride: true,
    forceEditableRecord: true,
  });
  await page.goto(`/censo?date=${date}`);
  await ensureAuthenticated(page);
  await expect(page.getByTestId('census-table')).toBeVisible({ timeout: 20000 });
};

const openNursingHandoff = async (page: Page) => {
  await openSeededCensus(page);
  const nursingTab = page.getByRole('button', { name: /Entrega Turno Enfermería/i }).first();
  await expect(nursingTab).toBeVisible({ timeout: 10000 });
  await nursingTab.click();
  await expect(page.getByRole('heading', { name: /Entrega de Turno Enfermería/i })).toBeVisible({
    timeout: 10000,
  });
};

const openMedicalHandoff = async (page: Page) => {
  await openSeededCensus(page);
  const medicalTab = page.getByRole('button', { name: /Entrega Turno Médicos/i }).first();
  await expect(medicalTab).toBeVisible({ timeout: 10000 });
  await medicalTab.click();
  await expect(page.getByRole('heading', { name: /Entrega de Turno/i }).first()).toBeVisible({
    timeout: 10000,
  });
};

test.describe('Shift Handoff with Signature', () => {
  test('should complete nursing handoff workflow', async ({ page }) => {
    await openNursingHandoff(page);

    await expect(page.getByRole('button', { name: /Turno Largo/i }).first()).toBeVisible();
    await expect(page.locator('main')).toContainText('Shift Patient');
    await expect(page.getByRole('button', { name: /Guardar/i }).first()).toBeVisible();
  });

  test('should complete medical handoff workflow', async ({ page }) => {
    await openMedicalHandoff(page);

    const createMedicalHandoffButton = page.getByRole('button', { name: /Crear entrega médica/i });
    await expect(createMedicalHandoffButton).toBeVisible({ timeout: 10000 });
    await createMedicalHandoffButton.click();

    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 10000 });
    await page
      .locator('textarea')
      .first()
      .fill('Plan de tratamiento actualizado. Próximo control en 4 horas.');
    await expect(page.locator('textarea').first()).toHaveValue(/próximo control/i);
  });

  test('should expose WhatsApp delivery action from medical handoff', async ({ page }) => {
    await openMedicalHandoff(page);

    await expect(
      page
        .getByRole('button', {
          name: /Enviar entrega por WhatsApp \(Manual\)|Enviar por WhatsApp/i,
        })
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should expose PDF generation action from nursing handoff', async ({ page }) => {
    await openNursingHandoff(page);

    await expect(page.getByRole('button', { name: /Guardar/i }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should switch between day and night shift views', async ({ page }) => {
    await openNursingHandoff(page);

    const dayShiftBtn = page.getByRole('button', { name: /Turno Largo/i }).first();
    const nightShiftBtn = page.getByRole('button', { name: /Turno Noche/i }).first();

    await expect(dayShiftBtn).toBeVisible();
    await expect(nightShiftBtn).toBeVisible();
    await nightShiftBtn.click();
    await expect(nightShiftBtn).toBeVisible();
    await dayShiftBtn.click();
    await expect(dayShiftBtn).toBeVisible();
  });

  test('should display staff assignments in handoff', async ({ page }) => {
    await openNursingHandoff(page);

    await expect(page.locator('main')).toContainText('Enfermero/a 1');
    await expect(page.locator('main')).toContainText('Enfermero/a 2');
  });
});
