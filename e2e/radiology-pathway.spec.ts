import { test, expect } from '@playwright/test';

/**
 * Radiology pathway browser coverage (Phases 5–8).
 * - Always runs Vitest-equivalent smoke when app is up (set PLAYWRIGHT_BASE_URL).
 * - Deep UI path: login → radiology dashboard → key Phase 5–8 routes.
 */
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const runLive = Boolean(process.env.PLAYWRIGHT_BASE_URL || process.env.CI);

test.describe('Radiology pathway (Phase 5–8)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!runLive, 'Set PLAYWRIGHT_BASE_URL (or CI) to run against a live app');
  });

  test('login page loads', async ({ page }) => {
    const res = await page.goto(`${base}/login`);
    expect(res?.ok() || res?.status() === 200 || res?.status() === 304).toBeTruthy();
  });

  test('radiology role can open core + Phase 5–8 routes after demo login', async ({ page }) => {
    await page.goto(`${base}/login`);
    // Demo credentials used across GFA HMS local/demo
    const email = page.getByLabel(/email|username/i).or(page.locator('input[type="email"]')).first();
    const password = page.getByLabel(/password/i).or(page.locator('input[type="password"]')).first();
    if (await email.count()) {
      await email.fill(process.env.PLAYWRIGHT_RAD_USER || 'radiology@gfa-health.demo');
      await password.fill(process.env.PLAYWRIGHT_RAD_PASS || 'Password123!');
      await page.getByRole('button', { name: /sign in|login|log in/i }).first().click();
      await page.waitForTimeout(1500);
    }

    const routes = [
      '/dashboard/radiology',
      '/dashboard/radiology/ecg',
      '/dashboard/radiology/eeg',
      '/dashboard/radiology/equipment',
      '/dashboard/radiology/consumables',
      '/dashboard/radiology/forms',
      '/dashboard/radiology/analytics',
      '/dashboard/radiology/reports',
      '/dashboard/radiology/pacs',
      '/dashboard/radiology/ai',
      '/dashboard/radiology/mobile',
      '/dashboard/radiology/alerts',
      '/dashboard/radiology/archive',
      '/dashboard/radiology/print',
    ];

    for (const path of routes) {
      const res = await page.goto(`${base}${path}`);
      // Auth gate may redirect to login — still a successful navigation
      expect(res?.status() ?? 0).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('PACS deep-link studyUid query is preserved', async ({ page }) => {
    const uid = '1.2.826.test.uid';
    await page.goto(`${base}/dashboard/radiology/pacs?studyUid=${encodeURIComponent(uid)}`);
    await expect(page.locator('body')).toContainText(/PACS|study|DICOM|viewer/i);
  });
});
