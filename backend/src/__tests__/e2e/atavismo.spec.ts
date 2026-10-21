import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

test.describe.serial('Atavismo E2E Tests', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['.'] })
    window = await electronApp.firstWindow()
    await window.setViewportSize({ width: 1280, height: 900 })
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

  test('navigates to tree view and tests interactive SVG modes & zoom controls', async () => {
    // Navigate to Tree tab
    const treeTab = window.getByTestId('tab-tree')
    await treeTab.click()

    // Verify SVG canvas renders
    const svgCanvas = window.locator('.tree-svg')
    await expect(svgCanvas).toBeVisible({ timeout: 5000 })
    await expect(window.locator('.node-card-group').first()).toBeVisible()

    // Verify SVG node names are truncated with ellipsis and clipped within node cards
    await expect(window.locator('#nodeCardClip')).toBeAttached()
    const firstNodeName = await window.locator('.svg-node-name').first().textContent()
    expect(firstNodeName?.length).toBeLessThanOrEqual(20)
    expect(firstNodeName).toContain('…')

    // Test switching to Descendants view
    const descTab = window.getByRole('button', { name: /descendant/i })
    await descTab.click()
    await expect(window.locator('.node-card-group').first()).toBeVisible()

    // Test switching to Hourglass view
    const hgTab = window.getByRole('button', { name: /hourglass/i })
    await hgTab.click()
    await expect(window.locator('.node-card-group').first()).toBeVisible()

    // Test switching to Fan Chart view
    const fanTab = window.getByRole('button', { name: /fan/i })
    await fanTab.click()
    await expect(window.locator('.fan-arc').first()).toBeVisible()

    // Test switching to Family Units (Cards) view
    const cardsTab = window.getByRole('button', { name: /cards|units|unidades/i })
    await cardsTab.click()
    await expect(window.locator('.cards-view-scroll')).toBeVisible()

    // Switch back to Pedigree tree
    const pedTab = window.getByRole('button', { name: /pedigree/i })
    await pedTab.click()
    await expect(svgCanvas).toBeVisible()

    // Test zoom controls
    const zoomInBtn = window.locator('.zoom-btn', { hasText: '+' })
    await zoomInBtn.click()
    const resetBtn = window.locator('.zoom-btn', { hasText: '⟲' })
    await resetBtn.click()

    // Test switching to Descendants view
    const descBtn = window.getByRole('button', { name: /descendant/i })
    await descBtn.click()
    await expect(window.locator('.node-card-group').first()).toBeVisible()

    // Test switching to Hourglass view
    const hgBtn = window.getByRole('button', { name: /hourglass/i })
    await hgBtn.click()
    await expect(window.locator('.node-card-group').first()).toBeVisible()

    // Test switching to Fan Chart view (defaults to 360° full circle)
    const fanBtn = window.getByRole('button', { name: /fan|leque/i })
    await fanBtn.click()
    await expect(window.locator('.fan-arc').first()).toBeVisible()

    // Test Fan Chart 180° / 360° toggle
    const fan180Btn = window.getByRole('button', { name: /180/i })
    await expect(fan180Btn).toBeVisible()
    await fan180Btn.click()
    await expect(window.locator('.fan-arc').first()).toBeVisible()

    const fan360Btn = window.getByRole('button', { name: /360/i })
    await expect(fan360Btn).toBeVisible()
    await fan360Btn.click()
    await expect(window.locator('.fan-arc').first()).toBeVisible()
  })
})
