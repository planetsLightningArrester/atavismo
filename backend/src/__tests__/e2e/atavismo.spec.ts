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

  test('enforces fullscreen rendering performance invariants (zero idle layouts, filter-free SVG cards, layout-free pan/zoom, bounded DOM nodes)', async () => {
    await window.setViewportSize({ width: 1920, height: 1080 })

    // 1. Background video must not be present in the DOM
    await expect(window.locator('video')).toHaveCount(0)

    // Switch to Hourglass tree view at fullscreen
    const hgBtn = window.getByRole('button', { name: /hourglass/i })
    await hgBtn.click()
    const firstNodeBox = window.locator('.node-box').first()
    await expect(firstNodeBox).toBeVisible()

    // 2. SVG node cards must not use expensive per-node SVG <filter> (feDropShadow) surfaces
    const filterAttr = await firstNodeBox.getAttribute('filter')
    expect(filterAttr).toBeNull()
    const computedFilter = await firstNodeBox.evaluate((el) => globalThis.getComputedStyle(el).filter)
    expect(computedFilter).toBe('none')

    // Attach CDP session for deterministic rendering & layout telemetry
    const cdp = await window.context().newCDPSession(window)
    await cdp.send('Performance.enable')

    const getMetricsMap = async (): Promise<Record<string, number>> => {
      const { metrics } = await cdp.send('Performance.getMetrics')
      const map: Record<string, number> = {}
      for (const m of metrics) {
        map[m.name] = m.value
      }
      return map
    }

    // Settle layout after viewport resize
    await window.waitForTimeout(250)

    // 3. Idle Main-Thread Quietness: 0 layouts and 0 style recalculations over 500ms at rest
    const idleBefore = await getMetricsMap()
    await window.waitForTimeout(500)
    const idleAfter = await getMetricsMap()

    expect(idleAfter.LayoutCount - idleBefore.LayoutCount).toBe(0)
    expect(idleAfter.RecalcStyleCount - idleBefore.RecalcStyleCount).toBe(0)

    // 4. Pan/Zoom Layout-Thrashing Guard: 36 pan/zoom events must not reflow layout per frame (<= 2 total)
    const panBefore = await getMetricsMap()
    await window.evaluate(async () => {
      const vp = document.querySelector('.svg-viewport')
      if (vp === null) return
      const rect = vp.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      vp.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true }))
      for (let i = 1; i <= 30; i++) {
        vp.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + i * 4, clientY: cy + i * 2, bubbles: true }))
        if (i % 5 === 0) {
          vp.dispatchEvent(new WheelEvent('wheel', { clientX: cx, clientY: cy, deltaY: -80, bubbles: true, cancelable: true }))
        }
      }
      vp.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    const panAfter = await getMetricsMap()

    expect(panAfter.LayoutCount - panBefore.LayoutCount).toBeLessThanOrEqual(2)

    // 5. Bounded DOM Complexity: Records tab pagination caps rendered rows at 100 and keeps live DOM elements < 2000
    const recordsTab = window.getByTestId('tab-records')
    await recordsTab.click()
    await expect(window.locator('.records-table')).toBeVisible()
    await expect(window.locator('.record-row')).toHaveCount(100)
    const liveDomElements = await window.evaluate(() => document.querySelectorAll('*').length)
    expect(liveDomElements).toBeLessThan(2000)

    await cdp.detach()
  })

  test('explores Phase 4 life timeline, sources, repositories, media gallery, and fuzzy filters', async () => {
    const recordsTab = window.getByTestId('tab-records')
    await recordsTab.click()

    // 1. Verify chronological life timeline in Inspector Panel
    const timeline = window.getByTestId('inspector-timeline')
    await expect(timeline).toBeVisible()
    const timelineEventsCount = await window.getByTestId('timeline-event-item').count()
    expect(timelineEventsCount).toBeGreaterThan(0)

    // 2. Test diacritic-insensitive & typo-tolerant fuzzy search ("Sao Paulo" matches "São Paulo")
    const searchInput = window.getByTestId('search-records-input')
    await searchInput.fill('Sao Paulo')
    const matchedRows = await window.locator('.record-row').count()
    expect(matchedRows).toBeGreaterThan(0)
    await searchInput.fill('')

    // 3. Test "With Media" filter toggle and inspect person with media (@I2@ has @O1@/@O2@)
    const mediaFilterBtn = window.getByTestId('filter-with-media-btn')
    await mediaFilterBtn.click()
    const mediaRowsCount = await window.locator('.record-row').count()
    expect(mediaRowsCount).toBeGreaterThan(0)
    await window.locator('.record-row').first().click()
    await expect(window.getByTestId('inspector-media-section')).toBeVisible()
    await mediaFilterBtn.click()

    // 4. Switch to Sources (SOUR) sub-tab and verify source cards
    const sourcesSubtab = window.getByTestId('records-subtab-sources')
    await sourcesSubtab.click()
    await expect(window.getByTestId('sources-explorer-grid')).toBeVisible()
    expect(await window.getByTestId('source-card').count()).toBe(4)

    // 5. Switch to Repositories (REPO) sub-tab and verify repository cards
    const reposSubtab = window.getByTestId('records-subtab-repositories')
    await reposSubtab.click()
    await expect(window.getByTestId('repositories-explorer-grid')).toBeVisible()
    expect(await window.getByTestId('repository-card').count()).toBe(3)

    // 6. Switch to Multimedia (OBJE) sub-tab and verify media cards
    const mediaSubtab = window.getByTestId('records-subtab-media')
    await mediaSubtab.click()
    await expect(window.getByTestId('media-explorer-grid')).toBeVisible()
    expect(await window.getByTestId('media-card').count()).toBe(2)

    // Return to Individuals sub-tab
    await window.getByTestId('records-subtab-individuals').click()
    await expect(window.locator('.records-table')).toBeVisible()
  })

  test('explores Phase 5 kinship pathfinder, consanguinity degrees, demographic charts, and migration routes', async () => {
    const analyticsTab = window.getByTestId('tab-analytics')
    await analyticsTab.click()

    // 1. Verify Kinship Pathfinder & Consanguinity Calculator renders with default blood relationship
    await expect(window.getByTestId('kinship-calculator')).toBeVisible()
    await expect(window.getByTestId('kinship-result-banner')).toBeVisible()
    await expect(window.getByTestId('kinship-relation-badge')).toHaveText('Grandparent')
    await expect(window.getByTestId('kinship-civil-degree')).toHaveText('2º')
    await expect(window.getByTestId('kinship-shared-dna')).toHaveText('25%')
    expect(await window.getByTestId('kinship-step-card').count()).toBe(3)

    // 2. Test Swap button (Grandparent -> Grandchild)
    await window.getByTestId('kinship-swap-btn').click()
    await expect(window.getByTestId('kinship-relation-badge')).toHaveText('Grandchild')
    await expect(window.getByTestId('kinship-civil-degree')).toHaveText('2º')
    await window.getByTestId('kinship-swap-btn').click()

    // 3. Test Parent preset (1st degree, 50% shared DNA)
    await window.getByTestId('kinship-preset-parent').click()
    await expect(window.getByTestId('kinship-relation-badge')).toHaveText('Parent')
    await expect(window.getByTestId('kinship-civil-degree')).toHaveText('1º')
    await expect(window.getByTestId('kinship-shared-dna')).toHaveText('50%')
    expect(await window.getByTestId('kinship-step-card').count()).toBe(2)

    // 4. Test Spouse preset (Affine marriage relationship, 0% shared DNA)
    await window.getByTestId('kinship-preset-spouse').click()
    await expect(window.getByTestId('kinship-relation-badge')).toHaveText('Spouse / Partner')
    await expect(window.getByTestId('kinship-shared-dna')).toHaveText('0%')

    // 5. Verify Demographic KPIs, Era Histogram, Longevity Brackets, and Migration Corridors
    await expect(window.getByTestId('analytics-kpi-grid')).toBeVisible()
    await expect(window.getByTestId('kpi-avg-lifespan')).toContainText('yrs')

    await expect(window.getByTestId('analytics-era-chart')).toBeVisible()
    expect(await window.getByTestId('era-bucket-row').count()).toBeGreaterThan(0)

    await expect(window.getByTestId('analytics-longevity-chart')).toBeVisible()
    expect(await window.getByTestId('longevity-bracket-row').count()).toBe(5)

    await expect(window.getByTestId('migration-routes-list')).toBeVisible()
    expect(await window.getByTestId('migration-route-item').count()).toBeGreaterThan(0)

    await expect(window.getByTestId('top-places-list')).toBeVisible()
    expect(await window.getByTestId('top-place-item').count()).toBeGreaterThan(0)
  })
})
