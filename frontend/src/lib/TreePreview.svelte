<script lang="ts">
  import { onMount } from 'svelte'
  import * as d3 from 'd3'
  import '../i18n'
  import { _ } from 'svelte-i18n'
  import { cleanName, formatLifespan, truncateText } from './common'

  export let individuals: Individual[] = []
  export let families: Family[] = []
  export let selectedIndividualId: string = ''

  type ViewMode = 'pedigree' | 'descendants' | 'hourglass' | 'fan' | 'cards'
  let viewMode: ViewMode = 'pedigree'
  let maxGenerations: number = 4
  let searchQuery: string = ''
  let showSearchDropdown: boolean = false

  // DOM elements & dimensions
  let svgElement: SVGSVGElement | null = null
  let containerWidth: number = 900
  let containerHeight: number = 650
  let viewportWidth: number = 900
  let viewportHeight: number = 550

  type FanAngleMode = '360' | '180'
  let fanAngleMode: FanAngleMode = '360'
  let hasUserPanned: boolean = false

  // Pan & Zoom transform state
  let panX: number = 100
  let panY: number = 300
  let zoom: number = 1.0
  let isDragging: boolean = false
  let startDragX: number = 0
  let startDragY: number = 0

  $: indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))
  $: famMap = new Map<string, Family>(families.map((f) => [f.id, f]))

  // Select default person if not set
  $: {
    if (selectedIndividualId.length === 0 && individuals.length > 0) {
      const withLinks = individuals.find((i) => i.famc.length > 0 && i.fams.length > 0)
      selectedIndividualId = withLinks?.id ?? individuals[0].id
    }
  }

  $: currentPerson = indiMap.get(selectedIndividualId)

  // Quick search filter
  $: searchResults = (() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length === 0) return []
    return individuals
      .filter((i) => (i.name?.toLowerCase().includes(q) ?? false) || i.id.toLowerCase().includes(q))
      .slice(0, 10)
  })()

  // Navigation history
  let history: string[] = []

  function navigateTo(id: string): void {
    if (selectedIndividualId.length > 0 && selectedIndividualId !== id) {
      history = [...history, selectedIndividualId]
    }
    selectedIndividualId = id
    searchQuery = ''
    showSearchDropdown = false
    centerOnFocus()
  }

  function goBack(): void {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      history = history.slice(0, -1)
      selectedIndividualId = prev
      centerOnFocus()
    }
  }

  // -------------------------------------------------------------
  // Data Structures for Hierarchy Layouts
  // -------------------------------------------------------------
  interface TreeNodeData {
    id: string
    person: Individual
    role?: string
    children?: TreeNodeData[]
  }

  // Build recursive Ancestors tree
  function buildAncestorTree(indiId: string, depth: number, maxDepth: number): TreeNodeData | null {
    const p = indiMap.get(indiId)
    if (p === undefined) return null

    const node: TreeNodeData = { id: p.id, person: p, children: [] }

    if (depth < maxDepth && p.famc.length > 0) {
      for (const famId of p.famc) {
        const fam = famMap.get(famId)
        if (fam !== undefined) {
          if (typeof fam.husbandId === 'string' && fam.husbandId.length > 0) {
            const father = buildAncestorTree(fam.husbandId, depth + 1, maxDepth)
            if (father !== null) {
              father.role = 'Father'
              node.children?.push(father)
            }
          }
          if (typeof fam.wifeId === 'string' && fam.wifeId.length > 0) {
            const mother = buildAncestorTree(fam.wifeId, depth + 1, maxDepth)
            if (mother !== null) {
              mother.role = 'Mother'
              node.children?.push(mother)
            }
          }
        }
      }
    }
    return node
  }

  // Build recursive Descendants tree
  function buildDescendantTree(indiId: string, depth: number, maxDepth: number): TreeNodeData | null {
    const p = indiMap.get(indiId)
    if (p === undefined) return null

    const node: TreeNodeData = { id: p.id, person: p, children: [] }

    if (depth < maxDepth && p.fams.length > 0) {
      for (const famId of p.fams) {
        const fam = famMap.get(famId)
        if (fam !== undefined) {
          for (const childId of fam.childrenIds) {
            const childNode = buildDescendantTree(childId, depth + 1, maxDepth)
            if (childNode !== null) {
              node.children?.push(childNode)
            }
          }
        }
      }
    }
    return node
  }

  interface RenderNode {
    id: string
    x: number
    y: number
    data: TreeNodeData
    depth: number
  }

  interface RenderLink {
    id: string
    path: string
  }

  // Computed layout elements for Pedigree & Descendants
  $: treeData = (() => {
    if (currentPerson === undefined) return null

    if (viewMode === 'pedigree') {
      const rootData = buildAncestorTree(currentPerson.id, 1, maxGenerations)
      if (rootData === null) return null

      const root = d3.hierarchy<TreeNodeData>(rootData)
      const layout = d3.tree<TreeNodeData>().nodeSize([95, 270])
      const pointRoot = layout(root)

      const linkGen = d3
        .linkHorizontal<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
        .x((d) => d.y)
        .y((d) => d.x)

      const nodes: RenderNode[] = pointRoot.descendants().map((d) => ({
        id: `${d.data.id}-${d.depth}`,
        x: d.x,
        y: d.y,
        data: d.data,
        depth: d.depth
      }))

      const links: RenderLink[] = pointRoot.links().map((l, idx) => ({
        id: `ped-link-${idx}`,
        path: linkGen(l) ?? ''
      }))

      return { nodes, links }
    } else if (viewMode === 'descendants') {
      const rootData = buildDescendantTree(currentPerson.id, 1, maxGenerations)
      if (rootData === null) return null

      const root = d3.hierarchy<TreeNodeData>(rootData)
      const layout = d3.tree<TreeNodeData>().nodeSize([95, 270])
      const pointRoot = layout(root)

      const linkGen = d3
        .linkHorizontal<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
        .x((d) => d.y)
        .y((d) => d.x)

      const nodes: RenderNode[] = pointRoot.descendants().map((d) => ({
        id: `${d.data.id}-${d.depth}`,
        x: d.x,
        y: d.y,
        data: d.data,
        depth: d.depth
      }))

      const links: RenderLink[] = pointRoot.links().map((l, idx) => ({
        id: `desc-link-${idx}`,
        path: linkGen(l) ?? ''
      }))

      return { nodes, links }
    } else if (viewMode === 'hourglass') {
      // Hourglass: Ancestors to the left (-X), Descendants to the right (+X)
      const ancData = buildAncestorTree(currentPerson.id, 1, maxGenerations)
      const descData = buildDescendantTree(currentPerson.id, 1, maxGenerations)

      const allNodes: RenderNode[] = []
      const allLinks: RenderLink[] = []

      const linkGen = (sx: number, sy: number, tx: number, ty: number): string => {
        const mx = (sx + tx) / 2
        return `M${sx},${sy}C${mx},${sy} ${mx},${ty} ${tx},${ty}`
      }

      if (ancData !== null) {
        const ancRoot = d3.hierarchy<TreeNodeData>(ancData)
        const pointAncRoot = d3.tree<TreeNodeData>().nodeSize([95, 270])(ancRoot)
        for (const d of pointAncRoot.descendants()) {
          allNodes.push({ id: `anc-${d.data.id}-${d.depth}`, x: d.x, y: -d.y, data: d.data, depth: -d.depth })
        }
        for (let i = 0; i < pointAncRoot.links().length; i++) {
          const l = pointAncRoot.links()[i]
          allLinks.push({
            id: `anc-l-${i}`,
            path: linkGen(-l.source.y, l.source.x, -l.target.y, l.target.x)
          })
        }
      }

      if (descData !== null) {
        const descRoot = d3.hierarchy<TreeNodeData>(descData)
        const pointDescRoot = d3.tree<TreeNodeData>().nodeSize([95, 270])(descRoot)
        for (const d of pointDescRoot.descendants()) {
          if (d.depth > 0) {
            allNodes.push({ id: `desc-${d.data.id}-${d.depth}`, x: d.x, y: d.y, data: d.data, depth: d.depth })
          }
        }
        for (let i = 0; i < pointDescRoot.links().length; i++) {
          const l = pointDescRoot.links()[i]
          allLinks.push({
            id: `desc-l-${i}`,
            path: linkGen(l.source.y, l.source.x, l.target.y, l.target.x)
          })
        }
      }

      return { nodes: allNodes, links: allLinks }
    }
    return null
  })()

  // -------------------------------------------------------------
  // Fan Chart Data (Concentric Radial Slices)
  // -------------------------------------------------------------
  interface FanSlice {
    id: string
    person: Individual | null
    gen: number
    label: string
    lifespan: string
    path: string
    midAngle: number
    midRadius: number
    fill: string
  }

  $: fanSlices = (() => {
    if (viewMode !== 'fan' || currentPerson === undefined) return []

    const slices: FanSlice[] = []
    const radiusStep = 68
    const maxGen = Math.min(maxGenerations, 5)

    const is360 = fanAngleMode === '360'
    const startAngle = is360 ? 0 : -Math.PI / 2
    const endAngle = is360 ? 2 * Math.PI : Math.PI / 2

    // Center slice (Generation 0 - Root Person)
    const arcGen0 = d3.arc().innerRadius(0).outerRadius(radiusStep).startAngle(startAngle).endAngle(endAngle)
    slices.push({
      id: currentPerson.id,
      person: currentPerson,
      gen: 0,
      label: cleanName(currentPerson.name),
      lifespan: formatLifespan(currentPerson.birth, currentPerson.death),
      path: arcGen0(null as unknown as d3.DefaultArcObject) ?? '',
      midAngle: is360 ? Math.PI : 0,
      midRadius: radiusStep / 2,
      fill: currentPerson.sex === 'M' ? '#1e3a5f' : currentPerson.sex === 'F' ? '#501e38' : '#2d3748'
    })

    // Recursive helper to populate fan rings
    function fillAncestors(
      indiId: string,
      gen: number,
      sAngle: number,
      eAngle: number
    ): void {
      if (gen > maxGen) return

      const person = indiMap.get(indiId)
      if (person === undefined || person.famc.length === 0) return

      const span = (eAngle - sAngle) / 2
      const fam = famMap.get(person.famc[0])
      if (fam === undefined) return

      const arcGen = d3
        .arc()
        .innerRadius(gen * radiusStep)
        .outerRadius((gen + 1) * radiusStep - 2)
        .padAngle(0.008)

      // Father's arc (left / first half)
      const father = typeof fam.husbandId === 'string' && fam.husbandId.length > 0 ? (indiMap.get(fam.husbandId) ?? null) : null
      const fStart = sAngle
      const fEnd = sAngle + span
      const fPath = arcGen({ innerRadius: gen * radiusStep, outerRadius: (gen + 1) * radiusStep - 2, startAngle: fStart, endAngle: fEnd } as unknown as d3.DefaultArcObject) ?? ''
      slices.push({
        id: father?.id ?? `empty-f-${gen}-${fStart}`,
        person: father,
        gen,
        label: cleanName(father?.name ?? '—'),
        lifespan: formatLifespan(father?.birth, father?.death),
        path: fPath,
        midAngle: (fStart + fEnd) / 2,
        midRadius: (gen + 0.5) * radiusStep,
        fill: d3.interpolateBlues(0.35 + (gen * 0.12))
      })
      if (father !== null) {
        fillAncestors(father.id, gen + 1, fStart, fEnd)
      }

      // Mother's arc (right / second half)
      const mother = typeof fam.wifeId === 'string' && fam.wifeId.length > 0 ? (indiMap.get(fam.wifeId) ?? null) : null
      const mStart = sAngle + span
      const mEnd = eAngle
      const mPath = arcGen({ innerRadius: gen * radiusStep, outerRadius: (gen + 1) * radiusStep - 2, startAngle: mStart, endAngle: mEnd } as unknown as d3.DefaultArcObject) ?? ''
      slices.push({
        id: mother?.id ?? `empty-m-${gen}-${mStart}`,
        person: mother,
        gen,
        label: cleanName(mother?.name ?? '—'),
        lifespan: formatLifespan(mother?.birth, mother?.death),
        path: mPath,
        midAngle: (mStart + mEnd) / 2,
        midRadius: (gen + 0.5) * radiusStep,
        fill: d3.interpolatePuRd(0.35 + (gen * 0.12))
      })
      if (mother !== null) {
        fillAncestors(mother.id, gen + 1, mStart, mEnd)
      }
    }

    fillAncestors(currentPerson.id, 1, startAngle, endAngle)
    return slices
  })()

  // -------------------------------------------------------------
  // Pan, Zoom & Viewport Controls
  // -------------------------------------------------------------
  function getTreeBounds(): { minX: number, maxX: number, minY: number, maxY: number } | null {
    if (treeData === null || treeData.nodes.length === 0) return null
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const n of treeData.nodes) {
      // In SVG: cx = n.y (horizontal), cy = n.x (vertical)
      const left = n.y - 110
      const right = n.y + 110
      const top = n.x - 40
      const bottom = n.x + 40
      if (left < minX) minX = left
      if (right > maxX) maxX = right
      if (top < minY) minY = top
      if (bottom > maxY) maxY = bottom
    }
    return { minX, maxX, minY, maxY }
  }

  function centerOnFocus(): void {
    const w = viewportWidth > 0 ? viewportWidth : (containerWidth > 0 ? containerWidth : 900)
    const h = viewportHeight > 0 ? viewportHeight : (containerHeight > 60 ? containerHeight - 60 : 550)

    if (viewMode === 'fan') {
      const radiusStep = 68
      const maxGen = Math.min(maxGenerations, 5)
      const maxRadius = (maxGen + 1) * radiusStep

      if (fanAngleMode === '360') {
        panX = w / 2
        panY = h / 2
        const availableDim = Math.min(w - 40, h - 40)
        zoom = Math.min(1.1, Math.max(0.35, availableDim / (maxRadius * 2)))
      } else {
        panX = w / 2
        panY = Math.min(h * 0.88, h - 30)
        const scaleW = (w - 40) / (maxRadius * 2)
        const scaleH = (h - 60) / maxRadius
        zoom = Math.min(1.1, Math.max(0.35, Math.min(scaleW, scaleH)))
      }
      return
    }

    if (viewMode === 'cards') return

    const bounds = getTreeBounds()
    if (bounds !== null) {
      const treeWidth = bounds.maxX - bounds.minX
      const treeHeight = bounds.maxY - bounds.minY
      const treeCenterX = (bounds.minX + bounds.maxX) / 2
      const treeCenterY = (bounds.minY + bounds.maxY) / 2

      const padX = 50
      const padY = 40
      const scaleX = (w - padX * 2) / Math.max(treeWidth, 220)
      const scaleY = (h - padY * 2) / Math.max(treeHeight, 100)
      const fitZoom = Math.min(1.05, Math.max(0.35, Math.min(scaleX, scaleY)))

      zoom = fitZoom
      panX = w / 2 - treeCenterX * zoom
      panY = h / 2 - treeCenterY * zoom
    } else {
      panX = w / 2
      panY = h / 2
      zoom = 0.9
    }
  }

  // Auto-center whenever tree layout, view mode, or focus person changes
  $: if ((treeData !== null || viewMode.length > 0 || selectedIndividualId.length > 0) && !hasUserPanned) {
    centerOnFocus()
  }

  function handleMouseDown(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.node-card-group') !== null) return
    isDragging = true
    startDragX = e.clientX - panX
    startDragY = e.clientY - panY
    hasUserPanned = true
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!isDragging) return
    panX = e.clientX - startDragX
    panY = e.clientY - startDragY
  }

  function handleMouseUp(): void {
    isDragging = false
  }

  function handleWheel(e: WheelEvent): void {
    e.preventDefault()
    hasUserPanned = true
    const factor = e.deltaY < 0 ? 1.12 : 0.89
    const newZoom = Math.min(3.2, Math.max(0.18, zoom * factor))

    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    panX = mouseX - (mouseX - panX) * (newZoom / zoom)
    panY = mouseY - (mouseY - panY) * (newZoom / zoom)
    zoom = newZoom
  }

  function zoomIn(): void {
    hasUserPanned = true
    zoom = Math.min(3.2, zoom * 1.25)
  }

  function zoomOut(): void {
    hasUserPanned = true
    zoom = Math.max(0.18, zoom * 0.8)
  }

  function resetZoom(): void {
    hasUserPanned = false
    centerOnFocus()
  }

  // -------------------------------------------------------------
  // Export to SVG & PNG
  // -------------------------------------------------------------
  function exportSvg(): void {
    if (svgElement === null) return
    const clone = svgElement.cloneNode(true) as SVGSVGElement
    const bbox = svgElement.getBBox()
    const pad = 40
    const w = bbox.width + pad * 2
    const h = bbox.height + pad * 2

    clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${w} ${h}`)
    clone.setAttribute('width', String(w))
    clone.setAttribute('height', String(h))

    const serializer = new XMLSerializer()
    const xml = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(clone)
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `atavismo-tree-${currentPerson?.id ?? 'export'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPng(): void {
    if (svgElement === null) return
    const bbox = svgElement.getBBox()
    const pad = 40
    const w = bbox.width + pad * 2
    const h = bbox.height + pad * 2

    const clone = svgElement.cloneNode(true) as SVGSVGElement
    clone.setAttribute('viewBox', `${bbox.x - pad} ${bbox.y - pad} ${w} ${h}`)
    clone.setAttribute('width', String(w))
    clone.setAttribute('height', String(h))

    const serializer = new XMLSerializer()
    const xml = serializer.serializeToString(clone)
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')
      if (ctx !== null) {
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.scale(scale, scale)
        ctx.drawImage(img, 0, 0)

        const pngUrl = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = `atavismo-tree-${currentPerson?.id ?? 'export'}.png`
        a.click()
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  // Family Units (Cards view fallback)
  $: parents = (() => {
    if (currentPerson === undefined || currentPerson.famc.length === 0) return []
    const list: Individual[] = []
    for (const famId of currentPerson.famc) {
      const fam = famMap.get(famId)
      if (fam !== undefined) {
        if (typeof fam.husbandId === 'string' && fam.husbandId.length > 0) {
          const f = indiMap.get(fam.husbandId)
          if (f !== undefined) list.push(f)
        }
        if (typeof fam.wifeId === 'string' && fam.wifeId.length > 0) {
          const m = indiMap.get(fam.wifeId)
          if (m !== undefined) list.push(m)
        }
      }
    }
    return list
  })()

  $: spouseUnits = (() => {
    if (currentPerson === undefined || currentPerson.fams.length === 0) return []
    const units: Array<{ fam: Family, spouse: Individual | undefined, children: Individual[] }> = []
    for (const famId of currentPerson.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined) {
        const spouseId = fam.husbandId === currentPerson.id ? fam.wifeId : fam.husbandId
        const spouse = typeof spouseId === 'string' && spouseId.length > 0 ? indiMap.get(spouseId) : undefined
        const children: Individual[] = []
        for (const cId of fam.childrenIds) {
          const ch = indiMap.get(cId)
          if (ch !== undefined) children.push(ch)
        }
        units.push({ fam, spouse, children })
      }
    }
    return units
  })()

  $: allChildren = spouseUnits.flatMap((u) => u.children)

  onMount(() => {
    centerOnFocus()
  })
</script>

<div class="tree-preview-container" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
  <!-- Top Control Bar -->
  <div class="tree-toolbar">
    <div class="toolbar-left">
      {#if history.length > 0}
        <button class="tool-btn back-btn" on:click={goBack}>
          ← {$_('family_tree.back')}
        </button>
      {/if}

      <!-- View Mode Tabs -->
      <div class="view-mode-tabs" role="tablist">
        <button
          class="mode-tab"
          class:active={viewMode === 'pedigree'}
          on:click={() => {
            viewMode = 'pedigree'
            centerOnFocus()
          }}
        >
          🌳 {$_('family_tree.view_pedigree')}
        </button>
        <button
          class="mode-tab"
          class:active={viewMode === 'descendants'}
          on:click={() => {
            viewMode = 'descendants'
            centerOnFocus()
          }}
        >
          🌿 {$_('family_tree.view_descendants')}
        </button>
        <button
          class="mode-tab"
          class:active={viewMode === 'hourglass'}
          on:click={() => {
            viewMode = 'hourglass'
            centerOnFocus()
          }}
        >
          ⏳ {$_('family_tree.view_hourglass')}
        </button>
        <button
          class="mode-tab"
          class:active={viewMode === 'fan'}
          on:click={() => {
            viewMode = 'fan'
            centerOnFocus()
          }}
        >
          🎯 {$_('family_tree.view_fan_chart')}
        </button>
        <button
          class="mode-tab"
          class:active={viewMode === 'cards'}
          on:click={() => {
            viewMode = 'cards'
          }}
        >
          📇 {$_('family_tree.view_cards')}
        </button>
      </div>

      {#if viewMode === 'fan'}
        <div class="fan-toggle-group">
          <button
            class="fan-toggle-btn"
            class:active={fanAngleMode === '360'}
            on:click={() => {
              fanAngleMode = '360'
              centerOnFocus()
            }}
            title={$_('family_tree.fan_360')}
          >
            ⭕ 360°
          </button>
          <button
            class="fan-toggle-btn"
            class:active={fanAngleMode === '180'}
            on:click={() => {
              fanAngleMode = '180'
              centerOnFocus()
            }}
            title={$_('family_tree.fan_180')}
          >
            🪭 180°
          </button>
        </div>
      {/if}
    </div>

    <div class="toolbar-right">
      <!-- Quick Person Jump Search -->
      <div class="jump-search-box">
        <input
          type="text"
          class="jump-input"
          placeholder={$_('family_tree.quick_jump')}
          bind:value={searchQuery}
          on:focus={() => {
            showSearchDropdown = true
          }}
        />
        {#if showSearchDropdown && searchResults.length > 0}
          <div class="jump-dropdown">
            {#each searchResults as r}
              <button
                class="jump-item"
                on:click={() => {
                  navigateTo(r.id)
                }}
              >
                <span class="jump-gender">{r.sex === 'M' ? '♂' : r.sex === 'F' ? '♀' : '👤'}</span>
                <span class="jump-name">{cleanName(r.name)}</span>
                <span class="jump-id">({r.id})</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Generations Depth Dropdown -->
      {#if viewMode !== 'cards'}
        <div class="gen-select-box">
          <label for="gen-depth-select">{$_('family_tree.generations')}:</label>
          <select id="gen-depth-select" bind:value={maxGenerations} class="gen-select">
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
            <option value={6}>6</option>
          </select>
        </div>

        <!-- Export Buttons -->
        <button class="tool-btn icon-btn" title={$_('family_tree.export_svg')} on:click={exportSvg}>
          ⬇ SVG
        </button>
        <button class="tool-btn icon-btn" title={$_('family_tree.export_png')} on:click={exportPng}>
          ⬇ PNG
        </button>

        <!-- Zoom Controls -->
        <div class="zoom-controls">
          <button class="zoom-btn" title={$_('family_tree.zoom_in')} on:click={zoomIn}>+</button>
          <button class="zoom-btn" title={$_('family_tree.zoom_out')} on:click={zoomOut}>−</button>
          <button class="zoom-btn" title={$_('family_tree.reset_zoom')} on:click={resetZoom}>⟲</button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Main Visualization Area -->
  {#if viewMode === 'cards'}
    <!-- Classical 3-Tier Family Units View -->
    <div class="cards-view-scroll">
      <div class="tree-canvas">
        <!-- 1. Parents Tier -->
        <div class="tree-tier parents-tier">
          <div class="tier-label">{$_('family_tree.parents')}</div>
          <div class="cards-row">
            {#if parents.length === 0}
              <div class="empty-node-card">{$_('family_tree.no_parents_recorded')}</div>
            {:else}
              {#each parents as parent}
                <button
                  class="node-card"
                  class:male={parent.sex === 'M'}
                  class:female={parent.sex === 'F'}
                  on:click={() => {
                    navigateTo(parent.id)
                  }}
                >
                  <div class="node-icon">{parent.sex === 'M' ? '♂' : parent.sex === 'F' ? '♀' : '👤'}</div>
                  <div class="node-info">
                    <div class="node-name">{cleanName(parent.name)}</div>
                    <div class="node-lifespan">{formatLifespan(parent.birth, parent.death)}</div>
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </div>

        <!-- 2. Central Person + Spouses Tier -->
        <div class="tree-tier focus-tier">
          <div class="tier-label">{$_('family_tree.current_individual_and_spouses')}</div>
          <div class="cards-row focus-row">
            {#if currentPerson !== undefined}
              <div class="node-card focus-card" class:male={currentPerson.sex === 'M'} class:female={currentPerson.sex === 'F'}>
                <div class="focus-badge">{$_('family_tree.primary_focus')}</div>
                <div class="node-icon large">{currentPerson.sex === 'M' ? '♂' : currentPerson.sex === 'F' ? '♀' : '👤'}</div>
                <div class="node-info">
                  <div class="node-name title-name">{cleanName(currentPerson.name)}</div>
                  <div class="node-lifespan">{formatLifespan(currentPerson.birth, currentPerson.death)}</div>
                  {#if typeof currentPerson.birth?.place === 'string' && currentPerson.birth.place.length > 0}
                    <div class="node-meta">📍 {currentPerson.birth.place}</div>
                  {/if}
                </div>
              </div>
            {/if}

            {#each spouseUnits as unit}
              {#if unit.spouse !== undefined}
                <button
                  class="node-card spouse-card"
                  class:male={unit.spouse.sex === 'M'}
                  class:female={unit.spouse.sex === 'F'}
                  on:click={() => {
                    if (unit.spouse !== undefined) navigateTo(unit.spouse.id)
                  }}
                >
                  <div class="node-icon">{unit.spouse.sex === 'M' ? '♂' : unit.spouse.sex === 'F' ? '♀' : '👤'}</div>
                  <div class="node-info">
                    <div class="node-name">{cleanName(unit.spouse.name)}</div>
                    <div class="node-lifespan">{formatLifespan(unit.spouse.birth, unit.spouse.death)}</div>
                    {#if typeof unit.fam.marriage?.date === 'string' && unit.fam.marriage.date.length > 0}
                      <div class="node-meta">{$_('family_tree.married')}: {unit.fam.marriage.date}</div>
                    {/if}
                  </div>
                </button>
              {/if}
            {/each}
          </div>
        </div>

        <!-- 3. Children Tier -->
        <div class="tree-tier children-tier">
          <div class="tier-label">{$_('family_tree.children')}</div>
          <div class="cards-row wrap-row">
            {#if allChildren.length === 0}
              <div class="empty-node-card">{$_('family_tree.no_descendants')}</div>
            {:else}
              {#each allChildren as child}
                <button
                  class="node-card"
                  class:male={child.sex === 'M'}
                  class:female={child.sex === 'F'}
                  on:click={() => {
                    navigateTo(child.id)
                  }}
                >
                  <div class="node-icon">{child.sex === 'M' ? '♂' : child.sex === 'F' ? '♀' : '👤'}</div>
                  <div class="node-info">
                    <div class="node-name">{cleanName(child.name)}</div>
                    <div class="node-lifespan">{formatLifespan(child.birth, child.death)}</div>
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Interactive D3 / SVG Vector Canvas -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="svg-viewport"
      class:grabbing={isDragging}
      bind:clientWidth={viewportWidth}
      bind:clientHeight={viewportHeight}
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseUp}
      on:wheel={handleWheel}
    >
      <svg bind:this={svgElement} class="tree-svg" width="100%" height="100%">
        <defs>
          <linearGradient id="maleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e3a5f" />
            <stop offset="100%" stop-color="#0f172a" />
          </linearGradient>
          <linearGradient id="femaleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4c1d3d" />
            <stop offset="100%" stop-color="#180b15" />
          </linearGradient>
          <linearGradient id="focusGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>
          <clipPath id="nodeCardClip">
            <rect x="-105" y="-36" width="202" height="72" rx="10" />
          </clipPath>
        </defs>

        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {#if viewMode === 'fan'}
            <!-- Fan Chart Arc Slices -->
            <g class="fan-group">
              {#each fanSlices as s}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <path
                  d={s.path}
                  fill={s.fill}
                  stroke="#0f172a"
                  stroke-width="1.5"
                  class="fan-arc"
                  class:active-focus={s.id === selectedIndividualId}
                  on:click={() => {
                    if (s.person !== null) navigateTo(s.person.id)
                  }}
                >
                  <title>{s.label} ({s.lifespan})</title>
                </path>
                {#if s.gen > 0 && s.person !== null}
                  <text
                    x={s.midRadius * Math.sin(s.midAngle)}
                    y={-s.midRadius * Math.cos(s.midAngle)}
                    text-anchor="middle"
                    alignment-baseline="middle"
                    class="fan-text"
                    font-size={s.gen <= 2 ? '11px' : '9px'}
                  >
                    {truncateText(s.label.split(' ')[0], s.gen <= 2 ? 10 : s.gen === 3 ? 8 : 6)}
                  </text>
                {/if}
              {/each}
              {#if currentPerson !== undefined}
                <text x="0" y={fanAngleMode === '180' ? -24 : 5} text-anchor="middle" class="fan-center-title">
                  {truncateText(cleanName(currentPerson.name).split(' ')[0], 11)}
                </text>
              {/if}
            </g>
          {:else if treeData !== null}
            <!-- Tree Connectors -->
            <g class="links-layer">
              {#each treeData.links as l (l.id)}
                <path d={l.path} fill="none" stroke="#334155" stroke-width="2" class="tree-link" />
              {/each}
            </g>

            <!-- Tree Node Cards -->
            <g class="nodes-layer">
              {#each treeData.nodes as n (n.id)}
                {@const p = n.data.person}
                {@const isSelected = p.id === selectedIndividualId}
                {@const cx = n.y}
                {@const cy = n.x}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <g
                  class="node-card-group"
                  class:selected={isSelected}
                  transform={`translate(${cx}, ${cy})`}
                  on:click={() => {
                    navigateTo(p.id)
                  }}
                >
                  <title>{cleanName(p.name)} {formatLifespan(p.birth, p.death)}</title>

                  <!-- Card Drop Shadow (filter-free for fast SVG pan/zoom) -->
                  <rect
                    x="-105"
                    y="-32"
                    width="210"
                    height="72"
                    rx="10"
                    fill="rgba(0, 0, 0, 0.38)"
                  />

                  <!-- Card Background -->
                  <rect
                    x="-105"
                    y="-36"
                    width="210"
                    height="72"
                    rx="10"
                    fill={p.sex === 'M' ? 'url(#maleGrad)' : 'url(#femaleGrad)'}
                    stroke={isSelected ? '#f59e0b' : p.sex === 'M' ? '#38bdf8' : '#f472b6'}
                    stroke-width={isSelected ? 3 : 1.5}
                    class="node-box"
                  />

                  <!-- Left Gender Accent Strip -->
                  <rect
                    x="-105"
                    y="-36"
                    width="6"
                    height="72"
                    rx="3"
                    fill={p.sex === 'M' ? '#38bdf8' : '#f472b6'}
                  />

                  <g clip-path="url(#nodeCardClip)">
                    <!-- Gender Icon -->
                    <text x="-86" y="-8" class="svg-node-icon" fill={p.sex === 'M' ? '#38bdf8' : '#f472b6'}>
                      {p.sex === 'M' ? '♂' : p.sex === 'F' ? '♀' : '👤'}
                    </text>

                    <!-- Individual Name -->
                    <text x="-66" y="-12" class="svg-node-name">
                      {truncateText(cleanName(p.name), 20)}
                    </text>

                    <!-- Lifespan Dates -->
                    <text x="-66" y="8" class="svg-node-dates">
                      {truncateText(formatLifespan(p.birth, p.death), 24)}
                    </text>

                    <!-- Birth Place / Role -->
                    <text x="-66" y="24" class="svg-node-place">
                      {truncateText(
                        typeof p.birth?.place === 'string' && p.birth.place.length > 0
                          ? p.birth.place.split(',')[0]
                          : (n.data.role ?? p.id),
                        26
                      )}
                    </text>
                  </g>

                  <!-- Primary Focus Tag Badge -->
                  {#if isSelected}
                    <g transform="translate(68, -44)">
                      <rect x="-35" y="0" width="70" height="18" rx="9" fill="url(#focusGlow)" />
                      <text x="0" y="12" text-anchor="middle" class="focus-tag-text">FOCUS</text>
                    </g>
                  {/if}
                </g>
              {/each}
            </g>
          {/if}
        </g>
      </svg>
    </div>
  {/if}
</div>

<style>
  .tree-preview-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 600px;
    background: #090d16;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .tree-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: #0f172a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
    gap: 10px;
    z-index: 10;
  }

  .toolbar-left,
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tool-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.25);
  }

  .view-mode-tabs {
    display: flex;
    background: rgba(0, 0, 0, 0.35);
    padding: 3px;
    border-radius: 8px;
    gap: 3px;
  }

  .mode-tab {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 6px 11px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .mode-tab:hover {
    color: #f8fafc;
  }

  .mode-tab.active {
    background: #2563eb;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
  }

  .fan-toggle-group {
    display: flex;
    background: rgba(0, 0, 0, 0.35);
    padding: 3px;
    border-radius: 8px;
    gap: 3px;
  }

  .fan-toggle-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 5px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .fan-toggle-btn:hover {
    color: #f8fafc;
  }

  .fan-toggle-btn.active {
    background: #0284c7;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
  }

  .jump-search-box {
    position: relative;
  }

  .jump-input {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 6px 10px;
    color: #f8fafc;
    font-size: 0.82rem;
    width: 170px;
    outline: none;
    transition: all 0.2s ease;
  }

  .jump-input:focus {
    width: 220px;
    border-color: #38bdf8;
    background: rgba(15, 23, 42, 0.9);
  }

  .jump-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: 240px;
    max-height: 240px;
    overflow-y: auto;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    z-index: 50;
  }

  .jump-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: #cbd5e1;
    text-align: left;
    cursor: pointer;
    font-size: 0.8rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .jump-item:hover {
    background: rgba(56, 189, 248, 0.12);
    color: #38bdf8;
  }

  .jump-gender {
    font-size: 0.95rem;
  }

  .jump-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .jump-id {
    color: #64748b;
    font-size: 0.75rem;
  }

  .gen-select-box {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    color: #94a3b8;
  }

  .gen-select {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 0.82rem;
    outline: none;
  }

  .zoom-controls {
    display: flex;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    overflow: hidden;
  }

  .zoom-btn {
    background: transparent;
    border: none;
    color: #cbd5e1;
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }

  .zoom-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }

  /* SVG Viewport & Canvas */
  .svg-viewport {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    position: relative;
    cursor: grab;
    user-select: none;
    background: radial-gradient(circle at 50% 50%, #111827 0%, #090d16 100%);
    overflow: hidden;
  }

  .svg-viewport.grabbing {
    cursor: grabbing;
  }

  .tree-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Tree Nodes SVG styling */
  .node-card-group {
    cursor: pointer;
  }

  .node-card-group:hover .node-box {
    stroke-width: 2.5;
  }

  .svg-node-icon {
    font-size: 20px;
    font-weight: bold;
    user-select: none;
  }

  .svg-node-name {
    fill: #f8fafc;
    font-size: 12px;
    font-weight: 600;
  }

  .svg-node-dates {
    fill: #94a3b8;
    font-size: 10.5px;
  }

  .svg-node-place {
    fill: #64748b;
    font-size: 9.5px;
  }

  .focus-tag-text {
    fill: #ffffff;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  .tree-link {
    transition: stroke 0.2s ease;
  }

  .tree-link:hover {
    stroke: #38bdf8;
    stroke-width: 3;
  }

  /* Fan Chart SVG */
  .fan-arc {
    cursor: pointer;
    transition: all 0.2s ease;
    opacity: 0.88;
  }

  .fan-arc:hover {
    opacity: 1;
    filter: brightness(1.25);
  }

  .fan-arc.active-focus {
    stroke: #f59e0b;
    stroke-width: 3;
    opacity: 1;
  }

  .fan-text {
    fill: #ffffff;
    font-weight: 600;
    pointer-events: none;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }

  .fan-center-title {
    fill: #f8fafc;
    font-size: 13px;
    font-weight: 700;
    pointer-events: none;
  }

  /* Family Units (Cards) View Styles */
  .cards-view-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    background: #090d16;
  }

  .tree-canvas {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 900px;
    margin: 0 auto;
  }

  .tree-tier {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .tier-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #64748b;
    text-transform: uppercase;
  }

  .cards-row {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    width: 100%;
  }

  .node-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 18px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: #f8fafc;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
    min-width: 200px;
    max-width: 280px;
  }

  .node-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .node-card.male {
    border-left: 4px solid #38bdf8;
  }

  .node-card.female {
    border-left: 4px solid #f472b6;
  }

  .node-card.focus-card {
    background: #172554;
    border: 2px solid #3b82f6;
    position: relative;
  }

  .focus-badge {
    position: absolute;
    top: -10px;
    right: 12px;
    background: #2563eb;
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    letter-spacing: 0.05em;
  }

  .node-icon {
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
  }

  .node-icon.large {
    width: 44px;
    height: 44px;
    font-size: 1.8rem;
  }

  .node-info {
    flex: 1;
    overflow: hidden;
  }

  .node-name {
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-name.title-name {
    font-size: 1.05rem;
    color: #ffffff;
  }

  .node-lifespan {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .node-meta {
    font-size: 0.75rem;
    color: #60a5fa;
    margin-top: 2px;
  }

  .empty-node-card {
    padding: 12px 24px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #64748b;
    font-size: 0.85rem;
    font-style: italic;
  }
</style>
