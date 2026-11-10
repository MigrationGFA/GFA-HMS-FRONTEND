import { test, expect } from '@playwright/test';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const runLive = Boolean(process.env.PLAYWRIGHT_BASE_URL || process.env.CI);

async function login(page: Parameters<typeof test>[0] extends never ? never : any, user: string, pass: string) {
  await page.goto(`${base}/login`);
  const email = page.getByLabel(/email|username/i).or(page.locator('input[type="email"]')).first();
  const password = page.getByLabel(/password/i).or(page.locator('input[type="password"]')).first();
  if ((await email.count()) > 0) {
    await email.fill(user);
    await password.fill(pass);
    await page.getByRole('button', { name: /sign in|login|log in/i }).first().click();
    await page.waitForTimeout(1500);
  }
}

test.describe('G.1 OPC to radiology flow', () => {
  test.beforeEach(() => {
    test.skip(!runLive, 'Set PLAYWRIGHT_BASE_URL to run against a live app');
  });

  test('OPC dashboard route loads', async ({ page }) => {
    await login(page, process.env.PLAYWRIGHT_OPC_USER || 'psychopc@gfa-health.demo', process.env.PLAYWRIGHT_OPC_PASS || 'Password123!');
    const res = await page.goto(`${base}/dashboard/psychiatry/opc`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/queue|check.?in|patient/i);
  });

  test('Cashier pending and imaging queues load', async ({ page }) => {
    await login(page, process.env.PLAYWRIGHT_CASHIER_USER || 'cashier@gfa-health.demo', process.env.PLAYWRIGHT_CASHIER_PASS || 'Password123!');
    const pending = await page.goto(`${base}/dashboard/cashier/pending`);
    expect(pending?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/bill|pending|patient/i);

    const imaging = await page.goto(`${base}/dashboard/cashier/pharmacy?tab=imaging`);
    expect(imaging?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Radiology dashboard loads for radiology role', async ({ page }) => {
    await login(page, process.env.PLAYWRIGHT_RAD_USER || 'radiology@gfa-health.demo', process.env.PLAYWRIGHT_RAD_PASS || 'Password123!');
    const res = await page.goto(`${base}/dashboard/radiology`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('G.2 Nursing to doctor handoff', () => {
  test.beforeEach(() => {
    test.skip(!runLive, 'Set PLAYWRIGHT_BASE_URL to run against a live app');
  });

  test('Nursing queue route loads', async ({ page }) => {
    await login(page, process.env.PLAYWRIGHT_NURSE_USER || 'nurse@gfa-health.demo', process.env.PLAYWRIGHT_NURSE_PASS || 'Password123!');
    const res = await page.goto(`${base}/dashboard/nurse/queues`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/queue|triage|patient/i);
  });

  test('Nurse orders and cashier cards routes load', async ({ page }) => {
    await login(page, process.env.PLAYWRIGHT_NURSE_USER || 'nurse@gfa-health.demo', process.env.PLAYWRIGHT_NURSE_PASS || 'Password123!');
    const orders = await page.goto(`${base}/dashboard/nurse/orders`);
    expect(orders?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();

    await login(page, process.env.PLAYWRIGHT_CASHIER_USER || 'cashier@gfa-health.demo', process.env.PLAYWRIGHT_CASHIER_PASS || 'Password123!');
    const cards = await page.goto(`${base}/dashboard/cashier/cards`);
    expect(cards?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/card|payment|patient/i);
  });
});
import { test, expect } from '@playwright/test';

/**
 * G.1 — OPC check-in → Imaging → Cashier → Radiology pathway
 * G.2 — Nursing queue → Doctor handoff; Cashier card pay
 *
 * Guards: tests skip when PLAYWRIGHT_BASE_URL is not set (i.e. local unit CI).
 */
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080';
const runLive = Boolean(process.env.PLAYWRIGHT_BASE_URL || process.env.CI);

async function login(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  user: string,
  pass: string,
) {
  await page.goto(`${base}/login`);
  const email = page
    .getByLabel(/email|username/i)
    .or(page.locator('input[type="email"]'))
    .first();
  const password = page
    .getByLabel(/password/i)
    .or(page.locator('input[type="password"]'))
    .first();
  if ((await email.count()) > 0) {
    await email.fill(user);
    await password.fill(pass);
    await page.getByRole('button', { name: /sign in|login|log in/i }).first().click();
    await page.waitForTimeout(1500);
  }
}

test.describe('G.1 — OPC → Imaging → Cashier → Radiology', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!runLive, 'Set PLAYWRIGHT_BASE_URL to run against a live app');
    void testInfo; // suppress unused param warning
  });

  test('OPC login lands on OPC dashboard', async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_OPC_USER || 'psychopc@gfa-health.demo',
      process.env.PLAYWRIGHT_OPC_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/psychiatry`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('OPC queue page is accessible', async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_OPC_USER || 'psychopc@gfa-health.demo',
      process.env.PLAYWRIGHT_OPC_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/psychiatry/opc`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/queue|check.?in|patient/i);
  });

  test('Radiology dashboard is reachable from radiology login', async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_RAD_USER || 'radiology@gfa-health.demo',
      process.env.PLAYWRIGHT_RAD_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/radiology`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Cashier pending bills page loads', async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_CASHIER_USER || 'cashier@gfa-health.demo',
      process.env.PLAYWRIGHT_CASHIER_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/cashier/pending`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/bill|pending|patient/i);
  });

  test('Cashier imaging tab in pharmacy page loads', async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_CASHIER_USER || 'cashier@gfa-health.demo',
      process.env.PLAYWRIGHT_CASHIER_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/cashier/pharmacy?tab=imaging`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('G.2 — Nursing queue → Doctor handoff; Cashier card pay', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(!runLive, 'Set PLAYWRIGHT_BASE_URL to run against a live app');
    void testInfo;
  });

  test('Nursing queue page is accessible', async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_NURSE_USER || 'nurse@gfa-health.demo',
      process.env.PLAYWRIGHT_NURSE_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/nurse/queues`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/queue|triage|patient/i);
  });

  test("Doctor's Orders page is accessible for nurse role", async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_NURSE_USER || 'nurse@gfa-health.demo',
      process.env.PLAYWRIGHT_NURSE_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/nurse/orders`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Cashier card payments page loads', async ({ page }) => {
    await login(
      page,
      process.env.PLAYWRIGHT_CASHIER_USER || 'cashier@gfa-health.demo',
      process.env.PLAYWRIGHT_CASHIER_PASS || 'Password123!',
    );
    const res = await page.goto(`${base}/dashboard/cashier/cards`);
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/card|payment|patient/i);
  });
});
