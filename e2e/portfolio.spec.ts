import { test, expect } from '@playwright/test'
import { clearDatabase, createGroup, addAsset, expandGroup } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await clearDatabase(page)
})

test('shows empty state', async ({ page }) => {
  await expect(page.getByText('No groups yet')).toBeVisible()
})

test('creates a group', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })

  await expect(page.getByText('Stocks')).toBeVisible()
  await expect(page.getByText('Target: 60%')).toBeVisible()
  await expect(page.getByText('Deviation: ±5%')).toBeVisible()
  await expect(page.getByText('must equal 100%')).toBeVisible()
})

test('groups totaling 100% clears warning', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '70', deviation: '5' })
  await expect(page.getByText('must equal 100%')).toBeVisible()

  await createGroup(page, { name: 'Bonds', target: '30', deviation: '5' })
  await expect(page.getByText('must equal 100%')).not.toBeVisible()
})

test('edits a group', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })

  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()

  await page.getByLabel('Name').clear()
  await page.getByLabel('Name').fill('Equities')
  await page.getByLabel('Target').clear()
  await page.getByLabel('Target').fill('70')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })

  await expect(page.getByText('Equities')).toBeVisible()
  await expect(page.getByText('Target: 70%')).toBeVisible()
})

test('deletes a group with confirmation', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })
  await expect(page.getByText('Stocks')).toBeVisible()

  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()

  // Confirmation dialog
  await expect(page.getByText('Are you sure you want to delete')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('No groups yet')).toBeVisible()
})

test('adds assets to a group', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })

  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' })
  await addAsset(page, 'Stocks', { name: 'Treasury Fund', type: 'fixed' })

  const card = await expandGroup(page, 'Stocks')
  await expect(card.getByText('AAPL')).toBeVisible()
  await expect(card.getByText('Units', { exact: true })).toBeVisible()
  await expect(card.getByText('Treasury Fund')).toBeVisible()
  await expect(card.getByText('Fixed amount')).toBeVisible()
  await expect(card.getByText('2 assets')).toBeVisible()
})

test('deactivates an asset and shows warning', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' })

  const card = await expandGroup(page, 'Stocks')
  const toggle = card.getByRole('switch')
  await toggle.click()

  await expect(page.getByText('no active assets')).toBeVisible()

  await toggle.click()
  await expect(page.getByText('no active assets')).not.toBeVisible()
})

test('edits an asset', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' })

  const card = await expandGroup(page, 'Stocks')
  const assetRow = card.getByRole('listitem').filter({ hasText: 'AAPL' })
  await assetRow.getByRole('button', { name: 'Edit' }).click()

  await page.getByLabel('Name').clear()
  await page.getByLabel('Name').fill('GOOG')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })

  await expect(card.getByText('GOOG')).toBeVisible()
  await expect(card.getByText('AAPL')).not.toBeVisible()
})

test('deletes an asset with confirmation', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' })
  await addAsset(page, 'Stocks', { name: 'MSFT', type: 'unit' })

  const card = await expandGroup(page, 'Stocks')
  const assetRow = card.getByRole('listitem').filter({ hasText: 'AAPL' })
  await assetRow.getByRole('button', { name: 'Delete' }).click()

  await expect(page.getByText('Are you sure you want to delete "AAPL"')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()

  await expect(card.getByText('AAPL')).not.toBeVisible()
  await expect(card.getByText('MSFT')).toBeVisible()
  await expect(card.getByText('1 asset')).toBeVisible()
})

test('deactivating one of multiple assets does not show warning', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' })
  await addAsset(page, 'Stocks', { name: 'MSFT', type: 'unit' })

  const card = await expandGroup(page, 'Stocks')
  const aaplRow = card.getByRole('listitem').filter({ hasText: 'AAPL' })
  await aaplRow.getByRole('switch').click()

  // MSFT is still active — warning should NOT appear
  await expect(page.getByText('no active assets')).not.toBeVisible()
})

test('cancel group dialog does not create group', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Group' }).click()
  await page.getByLabel('Name').fill('Stocks')
  await page.getByLabel('Target').fill('60')
  await page.getByLabel('Deviation Threshold').fill('5')
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByText('No groups yet')).toBeVisible()
})

test('group dialog shows validation errors', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Group' }).click()

  // Submit with all fields empty
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  await expect(page.getByText('Name is required')).toBeVisible()
  await expect(page.getByText('Must be a number > 0')).toBeVisible()
  await expect(page.getByText('Must be a number >= 0')).toBeVisible()

  // Fill target and set deviation >= target
  await page.getByLabel('Name').fill('Stocks')
  await page.getByLabel('Target').fill('10')
  await page.getByLabel('Deviation Threshold').fill('15')
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  await expect(page.getByText('Must be less than target')).toBeVisible()
})

test('deleting a group removes its assets from calculator', async ({ page }) => {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })
  await createGroup(page, { name: 'Bonds', target: '40', deviation: '5' })
  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' })
  await addAsset(page, 'Bonds', { name: 'Treasury Fund', type: 'fixed' })

  // Delete Stocks group
  const stocksCard = page.locator('.MuiCard-root', { hasText: 'Stocks' })
  await stocksCard.getByRole('button', { name: 'Options' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('button', { name: 'Delete' }).click()

  // Navigate to Calculator — only Bonds group should appear in the form
  await page.getByRole('tab', { name: 'Calculator' }).click()
  await expect(page.getByRole('paragraph').filter({ hasText: 'Treasury Fund' })).toBeVisible()
  await expect(page.getByText('AAPL')).not.toBeVisible()
})
