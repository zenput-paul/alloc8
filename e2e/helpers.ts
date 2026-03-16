import type { Page } from '@playwright/test'

export async function clearDatabase(page: Page) {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases()
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name)
    }
  })
  await page.reload()
  await page.getByRole('tab', { name: 'Portfolio' }).waitFor({ state: 'visible' })
}

export async function navigateTo(page: Page, tab: 'Portfolio' | 'Calculator') {
  await page.getByRole('tab', { name: tab }).click()
}

export async function createGroup(
  page: Page,
  { name, target, deviation }: { name: string; target: string; deviation: string },
) {
  await page.getByRole('button', { name: 'Add Group' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Target').fill(target)
  await page.getByLabel('Deviation Threshold').fill(deviation)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
}

export async function expandGroup(page: Page, groupName: string) {
  const card = page.locator('.MuiCard-root', { hasText: groupName })
  const addAssetBtn = card.getByRole('button', { name: 'Add Asset' })
  const isExpanded = await addAssetBtn.isVisible().catch(() => false)
  if (!isExpanded) {
    await card.getByRole('button', { name: 'Expand' }).click()
    await addAssetBtn.waitFor({ state: 'visible' })
  }
  return card
}

export async function addAsset(
  page: Page,
  groupName: string,
  { name, type }: { name: string; type: 'unit' | 'fixed' },
) {
  const card = await expandGroup(page, groupName)

  await card.getByRole('button', { name: 'Add Asset' }).click()

  await page.getByLabel('Name').fill(name)
  if (type === 'fixed') {
    await page.getByRole('button', { name: 'Fixed amount' }).click()
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
}

export async function createStandardPortfolio(page: Page) {
  await createGroup(page, { name: 'Stocks', target: '60', deviation: '5' })
  await createGroup(page, { name: 'Bonds', target: '40', deviation: '5' })

  await addAsset(page, 'Stocks', { name: 'AAPL', type: 'unit' })
  await addAsset(page, 'Stocks', { name: 'MSFT', type: 'unit' })
  await addAsset(page, 'Bonds', { name: 'Treasury Fund', type: 'fixed' })
}
