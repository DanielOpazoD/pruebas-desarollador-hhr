/**
 * E2E Tests: Date Navigation & Data Entry
 * Tests date switching and patient data entry workflows.
 */

import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

test.describe('Date Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockUser(page, 'editor');
    await injectMockData(page);
    await ensureRecordExists(page);
  });

  test('should display current month and year', async ({ page }) => {
    const today = new Date();
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const currentMonthName = monthNames[today.getMonth()];

    await expect(page.locator(`text=${currentMonthName}`).first()).toBeVisible();
    await expect(page.locator(`text=${today.getFullYear()}`).first()).toBeVisible();
  });

  test('should have navigation buttons for days', async ({ page }) => {
    const today = new Date().getDate();
    await expect(page.locator(`button:has-text("${today}")`).first()).toBeVisible();
  });
});

test.describe('Patient Data Entry', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockUser(page, 'editor');
    await injectMockData(page);
    await ensureRecordExists(page);
  });

  test('should allow typing in patient data fields', async ({ page }) => {
    const table = page.getByTestId('census-table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    const nameInput = table.locator('input[type="text"]').first();
    await expect(nameInput).toBeEnabled({ timeout: 10000 });

    await nameInput.fill('JUAN PEREZ');
    await expect(nameInput).toHaveValue('JUAN PEREZ');
  });

  test('should show save indicator after typing', async ({ page }) => {
    const table = page.getByTestId('census-table').first();
    await expect(table).toBeVisible({ timeout: 15000 });

    const nameInput = table.locator('input[type="text"]').first();
    await expect(nameInput).toBeEnabled({ timeout: 10000 });

    await nameInput.fill('Auto Save Test');

    // El guardado es onBlur en esta app
    await nameInput.blur();

    const statusBadge = page.locator('text=OFFLINE');
    await expect(statusBadge).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should render correctly on iPhone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await injectMockUser(page, 'editor');
    await injectMockData(page);
    await ensureRecordExists(page);

    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});
