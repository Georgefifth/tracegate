import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('evidence/stage-2-build/frontend');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PORT = 4389;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  stdio: 'pipe',
});

await new Promise((resolve) => setTimeout(resolve, 1500));

const consoleErrors = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: true });

try {
  // 1. Desktop 1440x900 Verification & Screenshots
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-1440-workbench-pass.png'), fullPage: true });

  // Test Tier 5 Gate Withheld State
  await page.getByRole('button', { name: 'Gate Withheld (Tier 5)' }).click();
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-1440-workbench-withheld.png'), fullPage: true });

  // Test Invalid Input State
  await page.getByRole('button', { name: 'Invalid Input' }).click();
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-1440-invalid-input.png'), fullPage: true });
  await page.getByRole('button', { name: /Reset to Standard Scale/i }).click();

  // Test Empty State
  await page.getByRole('button', { name: 'Empty State' }).click();
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-1440-empty-state.png'), fullPage: true });
  await page.getByRole('button', { name: /Load Default PTB-XL/i }).click();

  // Test Benchmark View
  await page.getByRole('button', { name: /2\. Held-Out Benchmark/i }).click();
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-1440-benchmark.png'), fullPage: true });

  // Test Methodology View
  await page.getByRole('button', { name: /3\. Methodology & Safety/i }).click();
  await page.getByRole('button', { name: /Run Deterministic Pipeline Self-Check/i }).click();
  await page.screenshot({ path: path.join(OUT_DIR, 'desktop-1440-methodology.png'), fullPage: true });

  await context.close();

  // 2. Mobile 390x844 Verification & Screenshots
  const mobContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobPage = await mobContext.newPage();
  mobPage.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  mobPage.on('pageerror', (err) => pageErrors.push(String(err)));

  await mobPage.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  const overflow = await mobPage.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  console.log('Mobile 390px overflow check:', overflow);
  if (overflow.scrollWidth > overflow.clientWidth) {
    throw new Error(`Mobile horizontal overflow detected: ${overflow.scrollWidth} > ${overflow.clientWidth}`);
  }
  await mobPage.screenshot({ path: path.join(OUT_DIR, 'mobile-390-workbench.png'), fullPage: true });
  await mobContext.close();

  console.log('Console errors:', consoleErrors.length, 'Page errors:', pageErrors.length);
  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new Error(`Errors found: ${JSON.stringify({ consoleErrors, pageErrors })}`);
  }
} finally {
  await browser.close();
  server.kill('SIGKILL');
}
process.exit(0);
