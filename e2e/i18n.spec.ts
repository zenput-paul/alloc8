import { test, expect } from '@playwright/test'
import { clearDatabase } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await clearDatabase(page)
})

test('switches language to Spanish and back', async ({ page }) => {
  // Verify English labels
  await expect(page.getByRole('tab', { name: 'Portfolio' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Group' })).toBeVisible()

  // Switch to Spanish
  await page.getByRole('button', { name: 'Change language' }).click()
  await page.getByRole('menuitem', { name: 'Español' }).click()

  // Verify Spanish labels
  await expect(page.getByRole('tab', { name: 'Portafolio' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar Grupo' })).toBeVisible()
  await expect(page.getByText('No hay grupos aún')).toBeVisible()

  // Switch back to English
  await page.getByRole('button', { name: 'Cambiar idioma' }).click()
  await page.getByRole('menuitem', { name: 'English' }).click()

  // Verify English labels restored
  await expect(page.getByRole('tab', { name: 'Portfolio' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Group' })).toBeVisible()
  await expect(page.getByText('No groups yet')).toBeVisible()
})
