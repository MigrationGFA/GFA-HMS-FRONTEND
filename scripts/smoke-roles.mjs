import { chromium } from 'playwright';

const roles = [
  ['Records', 'records'],
  ['Nurse', 'nurse'],
  ['Lab', 'lab'],
  ['Pharmacist', 'pharm'],
  ['Cashier', 'cashier'],
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();

for (const [label, pathPart] of roles) {
  await page.goto('http://127.0.0.1:5174/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForFunction(
    (part) => window.location.pathname.includes(part),
    pathPart,
    { timeout: 30000 },
  );
  const text = await page.locator('body').innerText();
  const bad = /VITE_USE_API|Backend API is not configured/i.test(text);
  console.log(
    label,
    page.url().replace('http://127.0.0.1:5174', ''),
    'api_err=' + bad,
    'gfa=' + /GFA/i.test(text),
  );
}

await browser.close();
