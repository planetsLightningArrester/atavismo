import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

test.describe.serial('Atavismo E2E Tests', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['.'] })
    window = await electronApp.firstWindow()
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('switches locales correctly with localized titles', async () => {
    const enUsButton = window.getByTestId('en-US-button')
    await expect(enUsButton).toBeVisible()
    await enUsButton.click()
    expect(await window.getByTestId('main-page-title').innerText()).toBe('Atavism')

    const zhCnButton = window.getByTestId('zh-CN-button')
    await expect(zhCnButton).toBeVisible()
    await zhCnButton.click()
    expect(await window.getByTestId('main-page-title').innerText()).toBe('返祖现象')

    const ptBrButton = window.getByTestId('pt-BR-button')
    await expect(ptBrButton).toBeVisible()
    await ptBrButton.click()
    expect(await window.getByTestId('main-page-title').innerText()).toBe('Atavismo')

    const esMxButton = window.getByTestId('es-MX-button')
    await expect(esMxButton).toBeVisible()
    await esMxButton.click()
    expect(await window.getByTestId('main-page-title').innerText()).toBe('Atavismo')

    // Switch back to English
    await enUsButton.click()
    expect(await window.getByTestId('main-page-title').innerText()).toBe('Atavism')
  })

  test('loads bundled sample dataset and renders tree stats', async () => {
    const sampleBtn = window.getByTestId('load-sample-button')
    await expect(sampleBtn).toBeVisible()
    await sampleBtn.click()

    // Wait for dataset to parse and metrics to appear
    await expect(window.locator('.metric-card').first()).toBeVisible({ timeout: 5000 })
  })
})
