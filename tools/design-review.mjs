/**
 * Playwright script that populates the app and captures screenshots
 * of every key UI state for design review.
 *
 * Usage: npx playwright test tools/design-review.mjs (won't work — it's not a test)
 * Run with: node tools/design-review.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}/alloc8/`;
const OUT = join(import.meta.dirname, '..', 'tmp', 'design-review');
mkdirSync(OUT, { recursive: true });

let shotIndex = 0;
async function screenshot(page, name, viewport) {
  const label = `${String(++shotIndex).padStart(2, '0')}-${name}-${viewport}`;
  const path = join(OUT, `${label}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸 ${label}`);
}

async function withViewports(page, name, fn) {
  // Desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  if (fn) await fn();
  await screenshot(page, name, 'desktop');

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(200);
  await screenshot(page, name, 'mobile');

  // Reset to desktop
  await page.setViewportSize({ width: 1280, height: 800 });
}

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
  const page = await context.newPage();

  // Clear any existing data
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('banner').waitFor({ state: 'visible' });

  console.log('\n🎨 Design Review Screenshots\n');

  // 1. Empty portfolio
  await withViewports(page, 'portfolio-empty');

  // 2. Add Group dialog
  await page.getByRole('button', { name: 'Add Group' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await withViewports(page, 'dialog-add-group');

  // 3. Add Group dialog with validation error
  await page.getByLabel('Target').fill('0');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.waitForTimeout(200);
  await withViewports(page, 'dialog-add-group-validation');

  // Fill in valid data and submit
  await page.getByLabel('Name').fill('Stocks');
  await page.getByLabel('Target').fill('60');
  await page.getByLabel('Deviation Threshold').fill('5');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // 4. Add second group
  await page.getByRole('button', { name: 'Add Group' }).click();
  await page.getByLabel('Name').fill('Bonds');
  await page.getByLabel('Target').fill('40');
  await page.getByLabel('Deviation Threshold').fill('5');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // 5. Portfolio with groups (percentage warning visible since groups have no assets yet)
  await withViewports(page, 'portfolio-with-groups');

  // 6. Expand group and show "no assets" state
  const stocksCard = page.locator('.MuiCard-root', { hasText: 'Stocks' });
  const bondsCard = page.locator('.MuiCard-root', { hasText: 'Bonds' });

  // Expand Stocks if not already
  const addAssetBtn = stocksCard.getByRole('button', { name: 'Add Asset' });
  if (!(await addAssetBtn.isVisible().catch(() => false))) {
    await stocksCard.getByRole('button', { name: /Expand|Collapse/ }).click();
    await addAssetBtn.waitFor({ state: 'visible' });
  }
  await withViewports(page, 'group-expanded-empty');

  // 7. Add Asset dialog (Units type)
  await stocksCard.getByRole('button', { name: 'Add Asset' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await withViewports(page, 'dialog-add-asset');

  // Fill and submit
  await page.getByLabel('Name').fill('AAPL');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // Add MSFT
  await stocksCard.getByRole('button', { name: 'Add Asset' }).click();
  await page.getByLabel('Name').fill('MSFT');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // Add Fixed asset dialog
  const bondsAddAsset = bondsCard.getByRole('button', { name: 'Add Asset' });
  if (!(await bondsAddAsset.isVisible().catch(() => false))) {
    await bondsCard.getByRole('button', { name: /Expand|Collapse/ }).click();
    await bondsAddAsset.waitFor({ state: 'visible' });
  }
  await bondsCard.getByRole('button', { name: 'Add Asset' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });

  // 8. Add Asset dialog — Fixed type
  await page.getByRole('button', { name: 'Fixed amount' }).click();
  await withViewports(page, 'dialog-add-asset-fixed');

  await page.getByLabel('Name').fill('Treasury Fund');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });

  // 9. Populated portfolio
  await withViewports(page, 'portfolio-populated');

  // 10. Group options menu
  await stocksCard.getByRole('button', { name: 'Options' }).click();
  await page.waitForTimeout(200);
  await withViewports(page, 'group-options-menu');
  await page.keyboard.press('Escape');

  // 11. Edit Group dialog
  await stocksCard.getByRole('button', { name: 'Options' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await withViewports(page, 'dialog-edit-group');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // 12. Delete Group confirmation
  await stocksCard.getByRole('button', { name: 'Options' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await withViewports(page, 'dialog-delete-group');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // 13. Calculator empty (no data entered yet)
  await page.getByRole('tab', { name: 'Calculator' }).click();
  await page.waitForTimeout(300);
  await withViewports(page, 'calculator-form-empty');

  // 14. Calculator with filled inputs
  await page.setViewportSize({ width: 1280, height: 800 });
  const totalInvestment = page.getByLabel('Amount to Invest');
  await totalInvestment.fill('10000');

  // Fill asset inputs
  const aaplValue = page.getByLabel('Current Value').nth(0);
  const aaplPrice = page.getByLabel('Unit Price').nth(0);
  const msftValue = page.getByLabel('Current Value').nth(1);
  const msftPrice = page.getByLabel('Unit Price').nth(1);
  const treasuryValue = page.getByLabel('Current Value').nth(2);

  await aaplValue.fill('5000');
  await aaplPrice.fill('175');
  await msftValue.fill('3000');
  await msftPrice.fill('420');
  await treasuryValue.fill('2000');

  await withViewports(page, 'calculator-form-filled');

  // 15. Calculate and show results
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: 'Calculate' }).click();
  await page.waitForTimeout(300);
  await withViewports(page, 'calculator-results');

  // 16. Language switch to Spanish
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: /Change language|Cambiar idioma/ }).click();
  await page.getByRole('menuitem', { name: /Español/ }).click();
  await page.waitForTimeout(300);
  await withViewports(page, 'calculator-results-spanish');

  // Switch back to English
  await page.getByRole('button', { name: /Cambiar idioma|Change language/ }).click();
  await page.getByRole('menuitem', { name: /English/ }).click();

  await browser.close();

  console.log(`\n✅ Done! ${shotIndex} screenshots saved to ${OUT}\n`);
}

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
