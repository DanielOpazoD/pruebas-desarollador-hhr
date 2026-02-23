import { test, expect } from '@playwright/test';
import { injectMockUser, injectMockData, ensureRecordExists } from './fixtures/auth';

/**
 * Offline Sync Resilience (Mocked Network)
 * As per the evaluation request: Simulates connection failures using page.route
 * to rigorously ensure that the Offline alert appears, local save is triggered,
 * and rollback applies if necessary.
 */
test.describe('Mocked Offline Network Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockUser(page, 'editor');
    await injectMockData(page);
    await ensureRecordExists(page);
  });

  test('should trigger offline alert and queue local save on firestore error', async ({ page }) => {
    // Intercept and abort all Firestore requests
    await page.route('**/*firestore.googleapis.com/**', route => {
      route.abort('internetdisconnected');
    });

    await page.goto('/');

    // Wait for table to be visible
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Find a patient name input and modify it
    const nameInput = page.locator('table input[type="text"]').first();
    await expect(nameInput).toBeEnabled();

    // Emulate user typing
    await nameInput.fill('OFFLINE MOCK TEST');
    await nameInput.blur(); // Trigger save

    // Validate the visual indicator (Offline badge/alert)
    const offlineBadge = page.locator('text=OFFLINE');
    await expect(offlineBadge).toBeVisible({ timeout: 10000 });

    // Optionally, check if a global error or sync queue indicator exists (e.g. Syncing... failed)
    // Ensure the typed data is NOT lost
    await expect(nameInput).toHaveValue('OFFLINE MOCK TEST');

    // Reload to verify offline/IndexedDB local saving persists if the app uses it
    await page.reload();
    await expect(page.locator('table input[type="text"]').first()).toHaveValue('OFFLINE MOCK TEST');
  });

  test('should rollback UI automatically upon save rejection (403 or specific error)', async ({
    page,
  }) => {
    // Intercept Save record and return 403 Forbidden to force a rollback
    await page.route('**/*firestore.googleapis.com/**/documents/dailyRecords/**', async route => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { message: 'Permission denied', status: 'PERMISSION_DENIED' },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    const nameInput = page.locator('table input[type="text"]').first();
    const initialValue = await nameInput.inputValue();

    await nameInput.fill('SHOULD ROLLBACK');
    await nameInput.blur();

    // Let the patch fail and optimistic update rollback happen
    // Ideally the input should revert back to initialValue if the UI gracefully rollbacks on 403
    // We add a short wait for the react-query mutation to settle
    await page.waitForTimeout(2000);

    // Depends on exact app behavior, but if it rollbacks synchronously on error:
    await expect(nameInput).toHaveValue(initialValue);
  });
});
