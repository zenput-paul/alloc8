import { test, expect } from '@playwright/test';
import {
  clearDatabase,
  createGroup,
  createStandardPortfolio,
  addAsset,
  expandGroup,
  navigateTo,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearDatabase(page);
});

test('shows empty state', async ({ page }) => {
  await navigateTo(page, 'Calculator');
  await expect(
    page.getByText('Add groups and assets in the Portfolio tab'),
  ).toBeVisible();
});

test('shows percentage warning', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' });
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' });

  await navigateTo(page, 'Calculator');
  await expect(page.getByText('must total 100%')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Calculate' })).toBeDisabled();
});

test('shows active assets warning', async ({ page }) => {
  await createStandardPortfolio(page);

  // Deactivate the only Bonds asset
  const bondsCard = await expandGroup(page, 'Bonds');
  await bondsCard.getByRole('switch').click();

  await navigateTo(page, 'Calculator');
  await expect(page.getByText('at least one active asset')).toBeVisible();
});

test('performs a calculation', async ({ page }) => {
  await createStandardPortfolio(page);
  await navigateTo(page, 'Calculator');

  await page.getByLabel('Amount to Invest').fill('10000');

  // Fill values scoped to each group section
  const stocksSection = page.locator('.MuiCard-root', { hasText: 'Stocks' });
  const bondsSection = page.locator('.MuiCard-root', { hasText: 'Bonds' });

  // AAPL (first unit asset in Stocks)
  await stocksSection.getByLabel('Current Value').nth(0).fill('5000');
  await stocksSection.getByLabel('Unit Price').nth(0).fill('150');

  // MSFT (second unit asset in Stocks)
  await stocksSection.getByLabel('Current Value').nth(1).fill('3000');
  await stocksSection.getByLabel('Unit Price').nth(1).fill('300');

  // Treasury Fund (fixed asset in Bonds)
  await bondsSection.getByLabel('Current Value').fill('2000');

  await page.getByRole('button', { name: 'Calculate' }).click();

  // Verify results appear
  await expect(page.getByText('Units to Buy')).toBeVisible();
  await expect(page.getByText('Units subtotal')).toBeVisible();
  await expect(page.getByText('Fixed subtotal')).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Total', exact: true }),
  ).toBeVisible();

  // Verify group stats in results
  await expect(page.getByText('Current:').first()).toBeVisible();
  await expect(page.getByText('After:').first()).toBeVisible();
});

test('reset clears form and results', async ({ page }) => {
  await createStandardPortfolio(page);
  await navigateTo(page, 'Calculator');

  await page.getByLabel('Amount to Invest').fill('10000');

  const stocksSection = page.locator('.MuiCard-root', { hasText: 'Stocks' });
  const bondsSection = page.locator('.MuiCard-root', { hasText: 'Bonds' });
  await stocksSection.getByLabel('Current Value').nth(0).fill('5000');
  await stocksSection.getByLabel('Unit Price').nth(0).fill('150');
  await stocksSection.getByLabel('Current Value').nth(1).fill('3000');
  await stocksSection.getByLabel('Unit Price').nth(1).fill('300');
  await bondsSection.getByLabel('Current Value').fill('2000');

  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.getByText('Units to Buy')).toBeVisible();

  await page.getByRole('button', { name: 'Reset' }).click();

  // Reset button should be gone
  await expect(page.getByRole('button', { name: 'Reset' })).not.toBeVisible();
  // Fields should be cleared
  await expect(page.getByLabel('Amount to Invest')).toHaveValue('');
  // Empty results table remains visible (shows structure as a preview)
  await expect(page.getByText('Units to Buy')).toBeVisible();
});

test('shows remainder alert', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '100', deviation: '5' });
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' });

  await navigateTo(page, 'Calculator');

  await page.getByLabel('Amount to Invest').fill('100');
  await page.getByLabel('Current Value').fill('0');
  await page.getByLabel('Unit Price').fill('75');

  await page.getByRole('button', { name: 'Calculate' }).click();

  // 100 / 75 = 1 unit at $75, remainder = $25
  await expect(page.getByText('could not be allocated')).toBeVisible();
});

test('inactive assets show disabled fields in calculator', async ({ page }) => {
  await createStandardPortfolio(page);

  // Deactivate MSFT
  const stocksCard = await expandGroup(page, 'Stocks');
  const msftRow = stocksCard.getByRole('listitem').filter({ hasText: 'MSFT' });
  await msftRow.getByRole('switch').click();

  await navigateTo(page, 'Calculator');

  // MSFT should show "(Inactive)" label
  await expect(page.getByText('(Inactive)')).toBeVisible();

  // Stocks section has 2 Unit Price fields: one enabled (AAPL), one disabled (MSFT)
  const stocksSection = page.locator('.MuiCard-root', { hasText: 'Stocks' });
  const unitPriceFields = stocksSection.getByLabel('Unit Price');
  await expect(unitPriceFields).toHaveCount(2);

  // Exactly one should be disabled (the inactive asset's)
  let disabledCount = 0;
  for (let i = 0; i < 2; i++) {
    if (await unitPriceFields.nth(i).isDisabled()) disabledCount++;
  }
  expect(disabledCount).toBe(1);
});

test('verifies allocation amounts', async ({ page }) => {
  // Simple scenario: 1 group at 100%, 1 unit asset, clean division
  await createGroup(page, { name: 'Stocks', target: '100', deviation: '5' });
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' });

  await navigateTo(page, 'Calculator');

  await page.getByLabel('Amount to Invest').fill('1000');
  await page.getByLabel('Current Value').fill('0');
  await page.getByLabel('Unit Price').fill('100');

  await page.getByRole('button', { name: 'Calculate' }).click();

  // 1000 / 100 = 10 units at $100 each = $1,000.00 total, no remainder
  const aaplRow = page.getByRole('row').filter({ hasText: 'AAPL' });
  await expect(aaplRow.getByRole('cell').nth(1)).toHaveText('10');
  await expect(aaplRow.getByRole('cell').nth(2)).toHaveText('1,000.00');
  await expect(page.getByText('could not be allocated')).not.toBeVisible();
});

test('recalculates after changing inputs', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '100', deviation: '5' });
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' });

  await navigateTo(page, 'Calculator');

  await page.getByLabel('Amount to Invest').fill('1000');
  await page.getByLabel('Current Value').fill('0');
  await page.getByLabel('Unit Price').fill('100');

  await page.getByRole('button', { name: 'Calculate' }).click();

  const aaplRow = page.getByRole('row').filter({ hasText: 'AAPL' });
  await expect(aaplRow.getByRole('cell').nth(1)).toHaveText('10');

  // Change unit price and recalculate
  await page.getByLabel('Unit Price').fill('200');
  await page.getByRole('button', { name: 'Calculate' }).click();

  await expect(aaplRow.getByRole('cell').nth(1)).toHaveText('5');
});

test('calculates with all fixed assets', async ({ page }) => {
  await createGroup(page, { name: 'Bonds', target: '60', deviation: '5' });
  await createGroup(page, { name: 'Savings', target: '40', deviation: '5' });
  await addAsset(page, 'Bonds', { name: 'Treasury', type: 'fixed' });
  await addAsset(page, 'Savings', { name: 'CD Fund', type: 'fixed' });

  await navigateTo(page, 'Calculator');

  const bondsSection = page.locator('.MuiCard-root', { hasText: 'Bonds' });
  const savingsSection = page.locator('.MuiCard-root', { hasText: 'Savings' });

  await page.getByLabel('Amount to Invest').fill('1000');
  await bondsSection.getByLabel('Current Value').fill('0');
  await savingsSection.getByLabel('Current Value').fill('0');

  await page.getByRole('button', { name: 'Calculate' }).click();

  // All fixed: no remainder, no units column values
  const treasuryRow = page.getByRole('row').filter({ hasText: 'Treasury' });
  const cdRow = page.getByRole('row').filter({ hasText: 'CD Fund' });
  await expect(treasuryRow.getByRole('cell').nth(2)).toHaveText('600.00');
  await expect(cdRow.getByRole('cell').nth(2)).toHaveText('400.00');
  await expect(page.getByText('could not be allocated')).not.toBeVisible();
});

test('handles zero investment', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '100', deviation: '5' });
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' });

  await navigateTo(page, 'Calculator');

  await page.getByLabel('Amount to Invest').fill('0');
  await page.getByLabel('Current Value').fill('1000');
  await page.getByLabel('Unit Price').fill('100');

  await page.getByRole('button', { name: 'Calculate' }).click();

  const aaplRow = page.getByRole('row').filter({ hasText: 'AAPL' });
  await expect(aaplRow.getByRole('cell').nth(1)).toHaveText('0');
  await expect(aaplRow.getByRole('cell').nth(2)).toHaveText('0.00');
  await expect(page.getByText('could not be allocated')).not.toBeVisible();
});

test('shows sections side by side on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await createStandardPortfolio(page);
  await navigateTo(page, 'Calculator');

  const details = page.getByText('Investment Details');
  const results = page.getByText('Allocation Results');
  await expect(details).toBeVisible();
  await expect(results).toBeVisible();

  const detailsBox = await details.boundingBox();
  const resultsBox = await results.boundingBox();

  // Side by side: results should be to the right, at roughly the same vertical position
  expect(resultsBox!.x).toBeGreaterThan(detailsBox!.x);
  expect(Math.abs(resultsBox!.y - detailsBox!.y)).toBeLessThan(10);
});

test('stacks sections on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await createStandardPortfolio(page);
  // Mobile uses BottomNavigation (buttons) instead of Tabs
  await page.getByRole('button', { name: 'Calculator' }).click();

  const details = page.getByText('Investment Details');
  const results = page.getByText('Allocation Results');
  await expect(details).toBeVisible();
  await expect(results).toBeVisible();

  const detailsBox = await details.boundingBox();
  const resultsBox = await results.boundingBox();

  // Stacked: results should be below the details
  expect(resultsBox!.y).toBeGreaterThan(detailsBox!.y);
  expect(Math.abs(resultsBox!.x - detailsBox!.x)).toBeLessThan(10);
});
