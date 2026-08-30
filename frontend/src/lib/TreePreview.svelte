<script lang="ts">
  import { cleanName, formatLifespan } from './common'

  export let individuals: Individual[] = []
  export let families: Family[] = []
  export let selectedIndividualId: string = ''

  $: indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))
  $: famMap = new Map<string, Family>(families.map((f) => [f.id, f]))

  // Select default if not set
  $: {
    if (selectedIndividualId.length === 0 && individuals.length > 0) {
      // Prefer someone with family links e.g. first with FAMC and FAMS
      const withLinks = individuals.find((i) => i.famc.length > 0 && i.fams.length > 0)
      selectedIndividualId = withLinks?.id ?? individuals[0].id
    }
  }

  $: currentPerson = indiMap.get(selectedIndividualId)

  // Parents computation
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

  // Spouses & Children computation
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

  // History stack for navigation
  let history: string[] = []

  function navigateTo(id: string): void {
    if (selectedIndividualId.length > 0 && selectedIndividualId !== id) {
      history = [...history, selectedIndividualId]
    }
    selectedIndividualId = id
  }

  function goBack(): void {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      history = history.slice(0, -1)
      selectedIndividualId = prev
    }
  }
</script>

<div class="tree-preview-container">
  <!-- Tree Navigation Header -->
  <div class="tree-toolbar">
    <div class="toolbar-left">
      {#if history.length > 0}
        <button
          class="tool-btn back-btn"
          on:click={() => {
            goBack()
          }}
        >
          ← Back
        </button>
      {/if}
      <span class="active-label">Focusing: <b>{cleanName(currentPerson?.name)}</b> ({currentPerson?.id})</span>
    </div>
    <div class="toolbar-right">
      <span class="badge-tag">Interactive Pedigree View</span>
    </div>
  </div>

  {#if currentPerson !== undefined}
    <div class="tree-canvas">
      <!-- 1. Parents Tier -->
      <div class="tree-tier parents-tier">
        <div class="tier-label">PARENTS</div>
        <div class="cards-row">
          {#if parents.length === 0}
            <div class="empty-node-card">No parents recorded</div>
          {:else}
            {#each parents as parent}
              <button
                class="node-card parent-card"
                class:male={parent.sex === 'M'}
                class:female={parent.sex === 'F'}
                on:click={() => {
                  navigateTo(parent.id)
                }}
              >
                <div class="node-icon">{parent.sex === 'M' ? '👨' : '👩'}</div>
                <div class="node-info">
                  <div class="node-name">{cleanName(parent.name)}</div>
                  <div class="node-lifespan">{formatLifespan(parent.birth, parent.death)}</div>
                  <div class="node-place">{parent.birth?.place ?? ''}</div>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>

      <div class="connector-line vertical"></div>

      <!-- 2. Central Person + Spouses Tier -->
      <div class="tree-tier focus-tier">
        <div class="tier-label">CURRENT INDIVIDUAL & SPOUSES</div>
        <div class="cards-row focus-row">
          <!-- Primary Focus Person -->
          <div class="node-card focus-card" class:male={currentPerson.sex === 'M'} class:female={currentPerson.sex === 'F'}>
            <div class="focus-badge">PRIMARY FOCUS</div>
            <div class="node-icon large">{currentPerson.sex === 'M' ? '♂' : currentPerson.sex === 'F' ? '♀' : '👤'}</div>
            <div class="node-info">
              <div class="node-name title-name">{cleanName(currentPerson.name)}</div>
              <div class="node-lifespan large">{formatLifespan(currentPerson.birth, currentPerson.death)}</div>
              {#if typeof currentPerson.birth?.place === 'string' && currentPerson.birth.place.length > 0}
                <div class="node-place">📍 {currentPerson.birth.place}</div>
              {/if}
              {#if typeof currentPerson.notes === 'string' && currentPerson.notes.length > 0}
                <div class="node-note-preview">"{currentPerson.notes.slice(0, 80)}..."</div>
              {/if}
            </div>
          </div>

          <!-- Spouses Cards -->
          {#each spouseUnits as unit}
            {#if unit.spouse !== undefined}
              <div class="connector-inline">💍</div>
              <button
                class="node-card spouse-card"
                class:male={unit.spouse.sex === 'M'}
                class:female={unit.spouse.sex === 'F'}
                on:click={() => {
                  navigateTo(unit.spouse?.id ?? '')
                }}
              >
                <div class="node-icon">{unit.spouse.sex === 'M' ? '👨' : '👩'}</div>
                <div class="node-info">
                  <div class="node-name">{cleanName(unit.spouse.name)}</div>
                  <div class="node-lifespan">{formatLifespan(unit.spouse.birth, unit.spouse.death)}</div>
                  {#if typeof unit.fam.marriage?.date === 'string' && unit.fam.marriage.date.length > 0}
                    <div class="node-meta">Married: {unit.fam.marriage.date}</div>
                  {/if}
                </div>
              </button>
            {/if}
          {/each}
        </div>
      </div>

      <div class="connector-line vertical"></div>

      <!-- 3. Children Tier -->
      <div class="tree-tier children-tier">
        <div class="tier-label">CHILDREN</div>
        <div class="cards-row wrap-row">
          {#if allChildren.length === 0}
            <div class="empty-node-card">No children recorded in family units</div>
          {:else}
            {#each allChildren as child}
              <button
                class="node-card child-card"
                class:male={child.sex === 'M'}
                class:female={child.sex === 'F'}
                on:click={() => {
                  navigateTo(child.id)
                }}
              >
                <div class="node-icon">{child.sex === 'M' ? '👦' : '👧'}</div>
                <div class="node-info">
                  <div class="node-name">{cleanName(child.name)}</div>
                  <div class="node-lifespan">{formatLifespan(child.birth, child.death)}</div>
                  <div class="node-place">{child.birth?.place ?? ''}</div>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .tree-preview-container {
    background: rgba(26, 32, 44, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .tree-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .tool-btn {
    background: rgba(49, 130, 206, 0.2);
    border: 1px solid rgba(49, 130, 206, 0.4);
    color: #63b3ed;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 13px;
    cursor: pointer;
    margin-right: 12px;
  }

  .tool-btn:hover {
    background: rgba(49, 130, 206, 0.35);
  }

  .active-label {
    font-size: 14px;
    color: #edf2f7;
  }

  .badge-tag {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #a0aec0;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
  }

  .tree-canvas {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .tree-tier {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .tier-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #718096;
    margin-bottom: 8px;
  }

  .cards-row {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: center;
  }

  .wrap-row {
    flex-wrap: wrap;
    max-width: 900px;
  }

  .connector-line.vertical {
    width: 2px;
    height: 24px;
    background: rgba(255, 255, 255, 0.15);
  }

  .connector-inline {
    font-size: 18px;
    color: #ecc94b;
  }

  .node-card {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    min-width: 200px;
    max-width: 260px;
  }

  .node-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    border-color: #4299e1;
  }

  .node-card.male {
    border-left: 4px solid #3182ce;
  }

  .node-card.female {
    border-left: 4px solid #d53f8c;
  }

  .focus-card {
    cursor: default;
    background: linear-gradient(135deg, rgba(30, 58, 138, 0.6), rgba(15, 23, 42, 0.8));
    border: 2px solid #3b82f6;
    min-width: 280px;
    max-width: 340px;
    position: relative;
    padding: 18px 20px;
  }

  .focus-badge {
    position: absolute;
    top: -10px;
    right: 12px;
    background: #3b82f6;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    letter-spacing: 0.5px;
  }

  .node-icon {
    font-size: 20px;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .node-icon.large {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .node-info {
    flex: 1;
    min-width: 0;
  }

  .node-name {
    font-weight: 600;
    font-size: 14px;
    color: #edf2f7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-name.title-name {
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
  }

  .node-lifespan {
    font-size: 12px;
    color: #a0aec0;
    margin-top: 2px;
  }

  .node-place {
    font-size: 11px;
    color: #718096;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-meta {
    font-size: 11px;
    color: #ecc94b;
    margin-top: 2px;
  }

  .node-note-preview {
    font-size: 11px;
    color: #a0aec0;
    font-style: italic;
    margin-top: 6px;
  }

  .empty-node-card {
    background: rgba(15, 23, 42, 0.3);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    color: #718096;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 13px;
  }
</style>
