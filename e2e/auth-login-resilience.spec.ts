import { test, expect } from '@playwright/test';

test.describe('Auth login resilience matrix', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hhr_e2e_force_popup', 'true');
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Ingresar con Google/i })).toBeVisible();
  });

  test('popup blocked shows alternate access control', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('hhr_e2e_popup_error_code', 'auth/popup-blocked');
    });

    await page.getByRole('button', { name: /Ingresar con Google/i }).click();

    await expect(page.getByRole('button', { name: /Acceso alternativo/i })).toBeVisible();
  });

  test('redirect timeout path surfaces clear error', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('hhr_e2e_popup_error_code', 'auth/network-request-failed');
      window.localStorage.setItem('hhr_e2e_redirect_mode', 'timeout');
    });

    await page.getByRole('button', { name: /Ingresar con Google/i }).click();
    await expect(page.getByRole('button', { name: /Acceso alternativo/i })).toBeVisible();
    await page.getByRole('button', { name: /Acceso alternativo/i }).click();

    await expect(page.getByText(/E2E redirect timeout/i, { exact: false })).toBeVisible();
  });

  test('retry after transient popup failure succeeds', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('hhr_e2e_popup_error_code', 'auth/network-request-failed');
      window.localStorage.setItem(
        'hhr_e2e_popup_success_user',
        JSON.stringify({
          uid: 'e2e-popup-user',
          email: 'e2e.popup@hospital.cl',
          displayName: 'E2E Popup User',
          role: 'admin',
        })
      );
    });

    await page.getByRole('button', { name: /Ingresar con Google/i }).click();
    await expect(page.getByRole('button', { name: /Acceso alternativo/i })).toBeVisible();

    await page.getByRole('button', { name: /Ingresar con Google/i }).click();
    await expect
      .poll(
        async () => page.evaluate(() => window.localStorage.getItem('hhr_e2e_popup_success_user')),
        { timeout: 5000 }
      )
      .toBeNull();
  });
});
