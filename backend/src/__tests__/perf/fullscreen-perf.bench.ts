import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

interface BenchmarkPhaseMetrics {
  phase: string
  fps: number
  avgFrameMs: number
  p95FrameMs: number
  droppedFrames: number
  taskDurationMs: number
  threadTimeMs: number
  layoutCount: number
  domNodes: number
  totalCpuPercent: number
  tabCpuPercent: number
  gpuCpuPercent: number
  memoryMB: number
}

interface WindowPerfState {
  __frameDeltas?: number[]
  __rafRunning?: boolean
}

async function runBenchmarkPhase(
  electronApp: ElectronApplication,
  window: Page,
  phaseName: string,
  durationMs: number,
  action?: () => Promise<void>
): Promise<BenchmarkPhaseMetrics> {
  const cdp = await window.context().newCDPSession(window)
  await cdp.send('Performance.enable')

  const getCdpMap = async (): Promise<Record<string, number>> => {
    const { metrics } = await cdp.send('Performance.getMetrics')
    const map: Record<string, number> = {}
    for (const m of metrics) {
      map[m.name] = m.value
    }
    return map
  }

  await electronApp.evaluate(async ({ app }) => app.getAppMetrics())
  const beforeCdp = await getCdpMap()

  await window.evaluate(() => {
    const win = globalThis as unknown as WindowPerfState
    win.__frameDeltas = []
    win.__rafRunning = true
    let last = performance.now()
    const tick = (now: number): void => {
      win.__frameDeltas?.push(now - last)
      last = now
      if (win.__rafRunning === true) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  })

  const startWall = Date.now()
  if (action !== undefined) {
    await action()
  }
  const elapsed = Date.now() - startWall
  if (elapsed < durationMs) {
    await window.waitForTimeout(durationMs - elapsed)
  }

  const deltas: number[] = await window.evaluate(() => {
    const win = globalThis as unknown as WindowPerfState
    win.__rafRunning = false
    return win.__frameDeltas ?? []
  })

  const afterCdp = await getCdpMap()
  const appMetrics = await electronApp.evaluate(async ({ app }) => {
    return app.getAppMetrics().map((m) => ({
      type: m.type,
      cpu: m.cpu.percentCPUUsage,
      memMB: Math.round((m.memory.workingSetSize ?? 0) / 1024)
    }))
  })

  await cdp.detach()

  const sorted = [...deltas].slice(1).sort((a, b) => a - b)
  const totalFrameTimeMs = sorted.reduce((acc, v) => acc + v, 0)
  const effectiveDurationMs = totalFrameTimeMs > 0 ? totalFrameTimeMs : durationMs
  const avgFrameMs = sorted.length > 0 ? effectiveDurationMs / sorted.length : 0
  const p95FrameMs = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0
  const droppedFrames = sorted.filter((d) => d > 25).length
  const fps = sorted.length > 0 ? (sorted.length / effectiveDurationMs) * 1000 : 0

  let totalCpuPercent = 0
  let tabCpuPercent = 0
  let gpuCpuPercent = 0
  let memoryMB = 0

  for (const m of appMetrics) {
    totalCpuPercent += m.cpu
    if (m.type === 'Tab') tabCpuPercent += m.cpu
    if (m.type === 'GPU') gpuCpuPercent += m.cpu
    memoryMB += m.memMB
  }

  return {
    phase: phaseName,
    fps: Number(fps.toFixed(1)),
    avgFrameMs: Number(avgFrameMs.toFixed(2)),
    p95FrameMs: Number(p95FrameMs.toFixed(2)),
    droppedFrames,
    taskDurationMs: Number(((afterCdp.TaskDuration - beforeCdp.TaskDuration) * 1000).toFixed(2)),
    threadTimeMs: Number(((afterCdp.ThreadTime - beforeCdp.ThreadTime) * 1000).toFixed(2)),
    layoutCount: afterCdp.LayoutCount - beforeCdp.LayoutCount,
    domNodes: afterCdp.Nodes,
    totalCpuPercent: Number(totalCpuPercent.toFixed(2)),
    tabCpuPercent: Number(tabCpuPercent.toFixed(2)),
    gpuCpuPercent: Number(gpuCpuPercent.toFixed(2)),
    memoryMB
  }
}

test('Fullscreen Performance Benchmark Suite (1920x1080)', async () => {
  test.setTimeout(120000)
  const electronApp = await electron.launch({ args: ['.'] })
  const window = await electronApp.firstWindow()

  await electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    win.setBounds({ x: 0, y: 0, width: 1920, height: 1080 })
    win.setFullScreen(true)
  })
  await window.setViewportSize({ width: 1920, height: 1080 })
  await window.waitForTimeout(600)

  const results: BenchmarkPhaseMetrics[] = []

  // Phase 1: Welcome Screen Idle (Fullscreen)
  results.push(await runBenchmarkPhase(electronApp, window, '1. Welcome Screen (Idle)', 2000))

  // Load sample dataset
  await window.getByTestId('load-sample-button').click()
  await window.locator('.metric-card').first().waitFor({ state: 'visible', timeout: 5000 })
  await window.waitForTimeout(400)

  // Phase 2: Overview Tab Idle (Fullscreen)
  results.push(await runBenchmarkPhase(electronApp, window, '2. Overview Tab (Idle)', 2000))

  // Switch to Tree Tab -> Hourglass (5 generations)
  await window.getByTestId('tab-tree').click()
  await window.locator('.tree-svg').waitFor({ state: 'visible', timeout: 5000 })
  await window.getByRole('button', { name: /hourglass/i }).click()
  await window.locator('.gen-select').selectOption('5')
  await window.waitForTimeout(500)

  // Phase 3: Tree Hourglass (5 Gen) Active Pan & Zoom
  results.push(
    await runBenchmarkPhase(electronApp, window, '3. Tree Hourglass 5-Gen (Pan/Zoom)', 1800, async () => {
      await window.evaluate(async () => {
        const vp = document.querySelector('.svg-viewport')
        if (vp === null) return
        const rect = vp.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2

        vp.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true }))
        for (let i = 0; i < 60; i++) {
          const dx = Math.sin(i * 0.2) * 180
          const dy = Math.cos(i * 0.2) * 120
          vp.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + dx, clientY: cy + dy, bubbles: true }))
          if (i % 4 === 0) {
            vp.dispatchEvent(
              new WheelEvent('wheel', {
                clientX: cx,
                clientY: cy,
                deltaY: i % 8 === 0 ? -100 : 100,
                bubbles: true,
                cancelable: true
              })
            )
          }
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }
        vp.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      })
    })
  )

  console.table(results)

  // Verify idle phases trigger 0 layouts and 60-frame pan/zoom stays bounded at <= 1 SVG layout per frame
  expect(results[0].layoutCount).toBe(0)
  expect(results[1].layoutCount).toBe(0)
  expect(results[2].layoutCount).toBeLessThanOrEqual(65)
  expect(results[2].taskDurationMs).toBeLessThan(500)

  await electronApp.close()
})
