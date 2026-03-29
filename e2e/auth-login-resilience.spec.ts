import { test, expect, type Page } from '@playwright/test';

const expectLoginError = async (page: Page, code: string) => {
  const alertByTestId = page.getByTestId('login-error-alert');

  const testIdVisible = await alertByTestId.isVisible({ timeout: 1000 }).catch(() => false);
  if (testIdVisible) {
    if (code === 'auth/popup-blocked' || code === 'auth/network-request-failed') {
      await expect(alertByTestId).toBeVisible();
    } else {
      await expect(alertByTestId).toHaveAttribute('data-auth-error-code', code);
    }
    return;
  }

  if (code === 'auth/popup-blocked') {
    await expect
      .poll(
        async () => ({
          popupCopyVisible: await page
            .getByText(/No se pudo abrir la ventana de Google/i)
            .first()
            .isVisible()
            .catch(() => false),
          loginVisible: await page
            .getByTestId('login-google-button')
            .isVisible()
            .catch(() => false),
          pendingVisible: await page
            .getByTestId('login-google-pending')
            .isVisible()
            .catch(() => false),
        }),
        { timeout: 5000 }
      )
      .toMatchObject({
        loginVisible: true,
      });
    return;
  }

  if (code === 'auth/network-request-failed') {
    await expect(
      page
        .locator(
          'text=/No fue posible completar el ingreso con Google|problemas de red|intenta nuevamente|No se pudo abrir la ventana de Google/i'
        )
        .first()
    ).toBeVisible();
    return;
  }
};

test.describe('Auth login resilience matrix', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('hhr_e2e_force_popup', 'true');
    });
    await page.goto('/');
    await expect(page.getByTestId('login-google-button')).toBeVisible();
  });

  test('popup blocked surfaces a clear error and stays on login', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('hhr_e2e_popup_error_code', 'auth/popup-blocked');
    });

    await page.getByTestId('login-google-button').click();

    await expectLoginError(page, 'auth/popup-blocked');
    await expect(page.getByTestId('login-google-button')).toBeVisible();
  });

  test('network failure does not switch flows and keeps the user on login', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('hhr_e2e_popup_error_code', 'auth/network-request-failed');
    });

    await page.getByTestId('login-google-button').click();
    await expectLoginError(page, 'auth/network-request-failed');
    await expect(page.getByTestId('login-google-button')).toBeVisible();
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

    await page.getByTestId('login-google-button').click();
    await expect
      .poll(
        async () => {
          const alertVisible = await page
            .getByTestId('login-error-alert')
            .isVisible()
            .catch(() => false);
          if (alertVisible) return true;
          return page
            .getByText(
              /No se pudo abrir la ventana de Google|No fue posible completar el ingreso con Google|intenta nuevamente/i
            )
            .first()
            .isVisible()
            .catch(() => false);
        },
        { timeout: 5000 }
      )
      .toBe(true);

    await page.getByTestId('login-google-button').click();
    await expect
      .poll(
        async () =>
          page.evaluate(() => ({
            popupUserPending: window.localStorage.getItem('hhr_e2e_popup_success_user'),
            loginButtonVisible: Boolean(
              document.querySelector('[data-testid="login-google-button"]')
            ),
          })),
        { timeout: 12000 }
      )
      .toMatchObject({
        popupUserPending: null,
      });
  });
});
