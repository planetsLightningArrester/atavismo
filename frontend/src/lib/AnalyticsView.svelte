<script lang="ts">
  import { _ } from 'svelte-i18n'
  import { cleanName, formatLifespan } from './common'
  import {
    calculateKinship,
    computeGenealogyAnalytics,
    type KinshipResult,
    type StepEdgeType
  } from './kinship'

  export let individuals: Individual[] = []
  export let families: Family[] = []
  export let selectedIndividualId: string = ''
  export let onSelectPersonInRecords: ((id: string) => void) | null = null

  let personAId = ''
  let personBId = ''

  $: indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))
  $: famMap = new Map<string, Family>(families.map((f) => [f.id, f]))

  function getParents(personId: string): string[] {
    const p = indiMap.get(personId)
    if (p === undefined) return []
    const res: string[] = []
    for (const fId of p.famc) {
      const fam = famMap.get(fId)
      if (fam !== undefined) {
        if (typeof fam.husbandId === 'string' && fam.husbandId.length > 0 && indiMap.has(fam.husbandId)) {
          res.push(fam.husbandId)
        }
        if (typeof fam.wifeId === 'string' && fam.wifeId.length > 0 && indiMap.has(fam.wifeId)) {
          res.push(fam.wifeId)
        }
      }
    }
    return res
  }

  function findDefaultTargetFor(originId: string): string {
    const parents = getParents(originId)
    for (const pId of parents) {
      const grandParents = getParents(pId)
      if (grandParents.length > 0) return grandParents[0]
    }
    if (parents.length > 0) return parents[0]
    const fallback = individuals.find((i) => i.id !== originId)
    return fallback?.id ?? originId
  }

  function hasGrandparents(personId: string): boolean {
    return getParents(personId).some((pId) => getParents(pId).length > 0)
  }

  $: {
    if (individuals.length > 0) {
      if (personAId.length === 0 || !indiMap.has(personAId)) {
        if (selectedIndividualId.length > 0 && hasGrandparents(selectedIndividualId)) {
          personAId = selectedIndividualId
        } else {
          const withGp = individuals.find((i) => hasGrandparents(i.id) && i.fams.length > 0)
          const withParents = individuals.find((i) => i.famc.length > 0)
          personAId = withGp?.id ?? withParents?.id ?? individuals[0].id
        }
      }
      if (personBId.length === 0 || !indiMap.has(personBId) || personBId === personAId) {
        personBId = findDefaultTargetFor(personAId)
      }
    }
  }

  $: kinshipResult = calculateKinship(individuals, families, personAId, personBId)
  $: analytics = computeGenealogyAnalytics(individuals, families)

  $: maxEraCount = Math.max(
    1,
    ...analytics.eraBuckets.map((b) => Math.max(b.births, b.deaths))
  )

  $: maxPlaceCount = Math.max(1, ...analytics.topPlaces.map((p) => p.count))

  // Quick relative presets relative to Person A
  $: presetParentId = (() => {
    const parents = getParents(personAId)
    return parents.length > 0 ? parents[0] : undefined
  })()

  $: presetGrandparentId = (() => {
    for (const pId of getParents(personAId)) {
      const gps = getParents(pId)
      if (gps.length > 0) return gps[0]
    }
    return undefined
  })()

  $: presetCousinOrSiblingId = (() => {
    const p = indiMap.get(personAId)
    if (p === undefined) return undefined
    // Try cousin first via aunt/uncle
    for (const parentId of getParents(personAId)) {
      const parent = indiMap.get(parentId)
      if (parent !== undefined) {
        for (const gpFamId of parent.famc) {
          const gpFam = famMap.get(gpFamId)
          if (gpFam !== undefined) {
            for (const auntUncleId of gpFam.childrenIds) {
              if (auntUncleId !== parentId) {
                const au = indiMap.get(auntUncleId)
                for (const auFamId of au?.fams ?? []) {
                  const auFam = famMap.get(auFamId)
                  if (auFam !== undefined && auFam.childrenIds.length > 0) {
                    return auFam.childrenIds[0]
                  }
                }
              }
            }
          }
        }
      }
    }
    // Fallback to sibling
    for (const famId of p.famc) {
      const fam = famMap.get(famId)
      const sib = fam?.childrenIds.find((id) => id !== personAId)
      if (sib !== undefined) return sib
    }
    return undefined
  })()

  $: presetSpouseId = (() => {
    const p = indiMap.get(personAId)
    if (p === undefined) return undefined
    for (const famId of p.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined) {
        const sp = fam.husbandId === personAId ? fam.wifeId : fam.husbandId
        if (typeof sp === 'string' && sp.length > 0 && indiMap.has(sp)) return sp
      }
    }
    return undefined
  })()

  function swapPersons(): void {
    const tmp = personAId
    personAId = personBId
    personBId = tmp
  }

  function handleInspectPerson(id: string): void {
    selectedIndividualId = id
    if (onSelectPersonInRecords !== null) {
      onSelectPersonInRecords(id)
    }
  }

  function formatRelationTitle(res: KinshipResult, translate: typeof $_): string {
    switch (res.relationType) {
      case 'ancestor':
        return translate({
          id: 'analytics.rel_ancestor',
          values: { generations: res.generations ?? res.genA ?? 4 }
        })
      case 'descendant':
        return translate({
          id: 'analytics.rel_descendant',
          values: { generations: res.generations ?? res.genB ?? 4 }
        })
      case 'great_aunt_uncle':
        return translate({
          id: 'analytics.rel_great_aunt_uncle',
          values: { generations: res.generations ?? 2 }
        })
      case 'great_niece_nephew':
        return translate({
          id: 'analytics.rel_great_niece_nephew',
          values: { generations: res.generations ?? 2 }
        })
      case 'nth_cousin':
        return translate({
          id: 'analytics.rel_nth_cousin',
          values: { degree: res.cousinDegree ?? 2 }
        })
      case 'cousin_removed':
        return translate({
          id: 'analytics.rel_cousin_removed',
          values: { degree: res.cousinDegree ?? 1, removal: res.removal ?? 1 }
        })
      default:
        return translate(`analytics.rel_${res.relationType}`)
    }
  }

  function formatEdgeLabel(edge: StepEdgeType | undefined, translate: typeof $_): string {
    if (edge === 'parent') return translate('analytics.edge_parent')
    if (edge === 'child') return translate('analytics.edge_child')
    if (edge === 'spouse') return translate('analytics.edge_spouse')
    return '→'
  }
</script>

<div class="analytics-container" data-testid="analytics-view">
  <!-- Section 1: Interactive Kinship & Consanguinity Pathfinder -->
  <section class="analytics-card kinship-section" data-testid="kinship-calculator">
    <div class="section-header">
      <div>
        <h3 class="section-title">🧬 {$_('analytics.kinship_title')}</h3>
        <p class="section-subtitle">{$_('analytics.kinship_subtitle')}</p>
      </div>

      <div class="preset-bar">
        {#if presetParentId !== undefined}
          <button
            class="preset-chip"
            data-testid="kinship-preset-parent"
            on:click={() => {
              if (presetParentId !== undefined) personBId = presetParentId
            }}
          >
            ↑ {$_('analytics.preset_parent')}
          </button>
        {/if}
        {#if presetGrandparentId !== undefined}
          <button
            class="preset-chip"
            data-testid="kinship-preset-grandparent"
            on:click={() => {
              if (presetGrandparentId !== undefined) personBId = presetGrandparentId
            }}
          >
            👑 {$_('analytics.preset_grandparent')}
          </button>
        {/if}
        {#if presetCousinOrSiblingId !== undefined}
          <button
            class="preset-chip"
            data-testid="kinship-preset-cousin"
            on:click={() => {
              if (presetCousinOrSiblingId !== undefined) personBId = presetCousinOrSiblingId
            }}
          >
            🤝 {$_('analytics.preset_cousin')}
          </button>
        {/if}
        {#if presetSpouseId !== undefined}
          <button
            class="preset-chip"
            data-testid="kinship-preset-spouse"
            on:click={() => {
              if (presetSpouseId !== undefined) personBId = presetSpouseId
            }}
          >
            💍 {$_('analytics.preset_spouse')}
          </button>
        {/if}
      </div>
    </div>

    <!-- Selectors Row -->
    <div class="kinship-selectors">
      <div class="selector-box">
        <label class="selector-label" for="kinship-person-a">{$_('analytics.person_a')}</label>
        <select
          id="kinship-person-a"
          class="person-select"
          bind:value={personAId}
          data-testid="kinship-person-a-select"
        >
          {#each individuals as indi (indi.id)}
            <option value={indi.id}>
              {cleanName(indi.name)} {formatLifespan(indi.birth, indi.death)} [{indi.id}]
            </option>
          {/each}
        </select>
      </div>

      <button class="swap-btn" data-testid="kinship-swap-btn" on:click={swapPersons}>
        ⇄ {$_('analytics.swap_persons')}
      </button>

      <div class="selector-box">
        <label class="selector-label" for="kinship-person-b">{$_('analytics.person_b')}</label>
        <select
          id="kinship-person-b"
          class="person-select"
          bind:value={personBId}
          data-testid="kinship-person-b-select"
        >
          {#each individuals as indi (indi.id)}
            <option value={indi.id}>
              {cleanName(indi.name)} {formatLifespan(indi.birth, indi.death)} [{indi.id}]
            </option>
          {/each}
        </select>
      </div>
    </div>

    <!-- Kinship & Consanguinity Summary Banner -->
    <div class="kinship-banner" data-testid="kinship-result-banner">
      <div class="relation-main">
        <span class="relation-caption">{$_('analytics.relation_label')}</span>
        <div class="relation-badge" data-testid="kinship-relation-badge">
          {formatRelationTitle(kinshipResult, $_)}
        </div>
        <span class="relation-type-pill" class:blood={kinshipResult.isBloodRelation}>
          {kinshipResult.isBloodRelation
            ? `🩸 ${$_('analytics.blood_relation')}`
            : `💍 ${$_('analytics.affine_relation')}`}
        </span>
      </div>

      <div class="consanguinity-metrics">
        {#if kinshipResult.civilDegree !== undefined}
          <div class="consang-stat">
            <span class="consang-val" data-testid="kinship-civil-degree">{kinshipResult.civilDegree}º</span>
            <span class="consang-lbl">{$_('analytics.civil_degree')}</span>
          </div>
        {/if}
        {#if kinshipResult.canonDegree !== undefined}
          <div class="consang-stat">
            <span class="consang-val">{kinshipResult.canonDegree}º</span>
            <span class="consang-lbl">{$_('analytics.canon_degree')}</span>
          </div>
        {/if}
        <div class="consang-stat">
          <span class="consang-val dna-val" data-testid="kinship-shared-dna">
            {kinshipResult.sharedDnaPercent}%
          </span>
          <span class="consang-lbl">{$_('analytics.shared_dna')}</span>
        </div>
        {#if kinshipResult.commonAncestorIds.length > 0}
          <div class="consang-stat lca-stat">
            <span class="consang-val">
              {kinshipResult.commonAncestorIds
                .map((id) => cleanName(indiMap.get(id)?.name))
                .join(' & ')}
            </span>
            <span class="consang-lbl">👑 {$_('analytics.common_ancestor')}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Step-by-Step Kinship Path Chain -->
    {#if kinshipResult.path.length > 0}
      <div class="path-wrapper">
        <div class="path-heading">
          {$_({ id: 'analytics.path_steps', values: { steps: kinshipResult.path.length } })}
        </div>
        <div class="path-chain" data-testid="kinship-path-chain">
          {#each kinshipResult.path as step, idx (`${step.personId}-${idx}`)}
            <button
              class="step-card"
              class:lca-highlight={step.isCommonAncestor === true}
              class:endpoint={idx === 0 || idx === kinshipResult.path.length - 1}
              data-testid="kinship-step-card"
              on:click={() => {
                handleInspectPerson(step.personId)
              }}
            >
              {#if step.isCommonAncestor === true}
                <span class="lca-crown">👑 {$_('analytics.common_ancestor')}</span>
              {/if}
              <div class="step-person-row">
                <span class="step-sex" class:m={step.sex === 'M'} class:f={step.sex === 'F'}>
                  {step.sex === 'M' ? '♂' : step.sex === 'F' ? '♀' : '👤'}
                </span>
                <span class="step-name">{step.name}</span>
              </div>
              <div class="step-meta">
                <span>{step.personId}</span>
                {#if step.lifespan.length > 0}
                  <span>{step.lifespan}</span>
                {/if}
              </div>
            </button>

            {#if step.edgeToNext !== undefined}
              <div class="step-connector">
                <span class="connector-pill">{formatEdgeLabel(step.edgeToNext, $_)}</span>
                <span class="connector-arrow">→</span>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <!-- Section 2: Demographic & Vital KPIs -->
  <div class="kpi-grid" data-testid="analytics-kpi-grid">
    <div class="kpi-card">
      <div class="kpi-icon">⏳</div>
      <div class="kpi-body">
        <div class="kpi-value" data-testid="kpi-avg-lifespan">
          {analytics.averageLifespan !== null
            ? $_({ id: 'analytics.years_unit', values: { years: analytics.averageLifespan } })
            : '—'}
        </div>
        <div class="kpi-label">{$_('analytics.avg_lifespan')}</div>
        <div class="kpi-sub">
          {#if analytics.maleAverageLifespan !== null}
            <span class="sub-pill m">♂ {analytics.maleAverageLifespan}</span>
          {/if}
          {#if analytics.femaleAverageLifespan !== null}
            <span class="sub-pill f">♀ {analytics.femaleAverageLifespan}</span>
          {/if}
        </div>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">🏆</div>
      <div class="kpi-body">
        <div class="kpi-value">
          {analytics.longestLivedPerson !== null
            ? $_({ id: 'analytics.years_unit', values: { years: analytics.longestLivedPerson.age } })
            : '—'}
        </div>
        <div class="kpi-label">{$_('analytics.longest_lived')}</div>
        {#if analytics.longestLivedPerson !== null}
          <button
            class="kpi-person-link"
            on:click={() => {
              if (analytics.longestLivedPerson !== null) {
                handleInspectPerson(analytics.longestLivedPerson.id)
              }
            }}
          >
            {analytics.longestLivedPerson.name}
          </button>
        {/if}
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">💍</div>
      <div class="kpi-body">
        <div class="kpi-value">
          {analytics.averageMarriageAge !== null
            ? $_({ id: 'analytics.years_unit', values: { years: analytics.averageMarriageAge } })
            : '—'}
        </div>
        <div class="kpi-label">{$_('analytics.avg_marriage_age')}</div>
        <div class="kpi-sub text-muted">n = {analytics.marriageAgeSampleSize}</div>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-icon">👨‍👩‍👧‍👦</div>
      <div class="kpi-body">
        <div class="kpi-value">{analytics.averageChildrenPerFamily}</div>
        <div class="kpi-label">{$_('analytics.avg_children')}</div>
        {#if analytics.largestFamily !== null}
          <div class="kpi-sub text-muted" title={analytics.largestFamily.parentsLabel}>
            {$_('analytics.largest_family')}: {analytics.largestFamily.childrenCount}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Section 3: Demographic Charts Row (Era Histogram & Age-at-Death Distribution) -->
  <div class="charts-grid">
    <!-- Chronological Births & Deaths by Era -->
    <section class="analytics-card" data-testid="analytics-era-chart">
      <div class="chart-header">
        <h4 class="chart-title">📊 {$_('analytics.era_chart_title')}</h4>
        <div class="chart-legend">
          <span class="legend-item"><span class="dot birth-dot"></span> {$_('main_page.birth')}</span>
          <span class="legend-item"><span class="dot death-dot"></span> {$_('main_page.death')}</span>
        </div>
      </div>

      <div class="era-bars">
        {#each analytics.eraBuckets as bucket (bucket.label)}
          <div class="era-row" data-testid="era-bucket-row">
            <span class="era-label">{bucket.label}</span>
            <div class="era-tracks">
              <div class="track-line">
                <div
                  class="bar-fill birth-fill"
                  style="width: {Math.max(4, Math.round((bucket.births / maxEraCount) * 100))}%"
                ></div>
                <span class="bar-num">{bucket.births}</span>
              </div>
              <div class="track-line">
                <div
                  class="bar-fill death-fill"
                  style="width: {Math.max(4, Math.round((bucket.deaths / maxEraCount) * 100))}%"
                ></div>
                <span class="bar-num">{bucket.deaths}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Age-at-Death Distribution -->
    <section class="analytics-card" data-testid="analytics-longevity-chart">
      <div class="chart-header">
        <h4 class="chart-title">📈 {$_('analytics.longevity_chart_title')}</h4>
      </div>

      <div class="bracket-list">
        {#each analytics.ageBrackets as bracket (bracket.label)}
          <div class="bracket-row" data-testid="longevity-bracket-row">
            <div class="bracket-top">
              <span class="bracket-label">
                {$_({ id: 'analytics.years_bracket', values: { bracket: bracket.label } })}
              </span>
              <span class="bracket-count">
                <b>{bracket.count}</b> ({bracket.percent}%)
              </span>
            </div>
            <div class="bracket-track">
              <div class="bracket-fill" style="width: {Math.max(2, bracket.percent)}%"></div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>

  <!-- Section 4: Migration Corridors & Top Geographic Hubs -->
  <div class="charts-grid" data-testid="analytics-migration-section">
    <section class="analytics-card">
      <div class="chart-header">
        <h4 class="chart-title">⛵ {$_('analytics.migration_title')}</h4>
      </div>

      {#if analytics.migrationRoutes.length === 0}
        <p class="text-muted">{$_('analytics.no_migrations')}</p>
      {:else}
        <div class="migration-list" data-testid="migration-routes-list">
          {#each analytics.migrationRoutes as route (`${route.origin}-${route.destination}`)}
            <div class="migration-card" data-testid="migration-route-item">
              <div class="migration-route-header">
                <div class="route-endpoints">
                  <span class="origin-tag">📍 {route.origin}</span>
                  <span class="route-arrow">➔</span>
                  <span class="dest-tag">🏁 {route.destination}</span>
                </div>
                <span class="route-count-badge">
                  {$_({ id: 'analytics.migrants_count', values: { count: route.count } })}
                </span>
              </div>
              <div class="migrant-chips">
                {#each route.personIds.slice(0, 6) as pId (pId)}
                  <button
                    class="migrant-chip"
                    on:click={() => {
                      handleInspectPerson(pId)
                    }}
                  >
                    {cleanName(indiMap.get(pId)?.name)}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="analytics-card">
      <div class="chart-header">
        <h4 class="chart-title">🌍 {$_('analytics.top_places_title')}</h4>
      </div>

      <div class="places-list" data-testid="top-places-list">
        {#each analytics.topPlaces as item (item.place)}
          <div class="place-row" data-testid="top-place-item">
            <div class="place-top">
              <span class="place-name">📍 {item.place}</span>
              <span class="place-count">{item.count}</span>
            </div>
            <div class="bracket-track">
              <div
                class="place-fill"
                style="width: {Math.max(5, Math.round((item.count / maxPlaceCount) * 100))}%"
              ></div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .analytics-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .analytics-card {
    background: rgba(26, 32, 44, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .section-title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #f8fafc;
  }

  .section-subtitle {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: #94a3b8;
  }

  .preset-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .preset-chip {
    background: rgba(49, 130, 206, 0.18);
    border: 1px solid rgba(66, 153, 225, 0.35);
    color: #90cdf4;
    border-radius: 16px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .preset-chip:hover {
    background: rgba(49, 130, 206, 0.35);
    color: #ffffff;
  }

  .kinship-selectors {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
    align-items: end;
    margin-bottom: 18px;
  }

  @media (max-width: 900px) {
    .kinship-selectors {
      grid-template-columns: 1fr;
    }
  }

  .selector-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .selector-label {
    font-size: 12px;
    font-weight: 600;
    color: #a0aec0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .person-select {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 10px 12px;
    color: #f1f5f9;
    font-size: 13.5px;
    outline: none;
  }

  .person-select:focus {
    border-color: #38bdf8;
  }

  .swap-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.16);
    color: #e2e8f0;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    height: 41px;
  }

  .swap-btn:hover {
    background: rgba(56, 189, 248, 0.2);
    border-color: #38bdf8;
  }

  .kinship-banner {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.85));
    border: 1px solid rgba(56, 189, 248, 0.25);
    border-radius: 10px;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .relation-main {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .relation-caption {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #94a3b8;
    font-weight: 600;
  }

  .relation-badge {
    font-size: 22px;
    font-weight: 800;
    color: #38bdf8;
  }

  .relation-type-pill {
    display: inline-block;
    align-self: flex-start;
    font-size: 11.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
    background: rgba(244, 114, 182, 0.18);
    color: #f472b6;
  }

  .relation-type-pill.blood {
    background: rgba(16, 185, 129, 0.18);
    color: #34d399;
  }

  .consanguinity-metrics {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .consang-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 8px 14px;
    min-width: 90px;
  }

  .consang-val {
    font-size: 16px;
    font-weight: 700;
    color: #f8fafc;
  }

  .consang-val.dna-val {
    color: #34d399;
  }

  .consang-lbl {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }

  .path-wrapper {
    margin-top: 8px;
  }

  .path-heading {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: #94a3b8;
    margin-bottom: 10px;
  }

  .path-chain {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .step-card {
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    padding: 10px 14px;
    color: #e2e8f0;
    cursor: pointer;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 155px;
  }

  .step-card:hover {
    border-color: #38bdf8;
    background: rgba(30, 41, 59, 0.9);
  }

  .step-card.endpoint {
    border-color: rgba(56, 189, 248, 0.5);
  }

  .step-card.lca-highlight {
    border-color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
  }

  .lca-crown {
    font-size: 10px;
    font-weight: 700;
    color: #fbbf24;
    text-transform: uppercase;
  }

  .step-person-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .step-sex.m {
    color: #63b3ed;
  }

  .step-sex.f {
    color: #f687b3;
  }

  .step-name {
    font-size: 13px;
    font-weight: 700;
    color: #f8fafc;
  }

  .step-meta {
    display: flex;
    gap: 6px;
    font-size: 11px;
    color: #94a3b8;
  }

  .step-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .connector-pill {
    font-size: 10.5px;
    color: #90cdf4;
    background: rgba(49, 130, 206, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .connector-arrow {
    color: #64748b;
    font-size: 14px;
  }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .kpi-card {
    background: rgba(26, 32, 44, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .kpi-icon {
    font-size: 26px;
    width: 46px;
    height: 46px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .kpi-value {
    font-size: 20px;
    font-weight: 700;
    color: #f8fafc;
  }

  .kpi-label {
    font-size: 12px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .kpi-sub {
    display: flex;
    gap: 6px;
    margin-top: 4px;
    font-size: 11.5px;
  }

  .sub-pill {
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
  }

  .sub-pill.m {
    background: rgba(49, 130, 206, 0.2);
    color: #63b3ed;
  }

  .sub-pill.f {
    background: rgba(213, 63, 140, 0.2);
    color: #f687b3;
  }

  .kpi-person-link {
    background: none;
    border: none;
    color: #38bdf8;
    font-size: 12px;
    padding: 0;
    margin-top: 4px;
    cursor: pointer;
    text-decoration: underline;
    text-align: left;
  }

  /* Charts Grid */
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 20px;
  }

  @media (max-width: 900px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .chart-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
  }

  .chart-legend {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: #cbd5e0;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .birth-dot {
    background: #38bdf8;
  }

  .death-dot {
    background: #fb7185;
  }

  .era-bars {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .era-row {
    display: grid;
    grid-template-columns: 90px 1fr;
    align-items: center;
    gap: 10px;
  }

  .era-label {
    font-size: 12px;
    font-family: monospace;
    color: #94a3b8;
  }

  .era-tracks {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .track-line {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bar-fill {
    height: 8px;
    border-radius: 4px;
  }

  .birth-fill {
    background: linear-gradient(90deg, #0284c7, #38bdf8);
  }

  .death-fill {
    background: linear-gradient(90deg, #e11d48, #fb7185);
  }

  .bar-num {
    font-size: 11px;
    color: #cbd5e0;
  }

  .bracket-list,
  .places-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bracket-top,
  .place-top {
    display: flex;
    justify-content: space-between;
    font-size: 12.5px;
    color: #e2e8f0;
    margin-bottom: 4px;
  }

  .bracket-track {
    width: 100%;
    height: 8px;
    background: rgba(15, 23, 42, 0.7);
    border-radius: 4px;
    overflow: hidden;
  }

  .bracket-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #34d399);
    border-radius: 4px;
  }

  .place-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #a855f7);
    border-radius: 4px;
  }

  .migration-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .migration-card {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .migration-route-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .route-endpoints {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
  }

  .origin-tag {
    color: #93c5fd;
  }

  .route-arrow {
    color: #64748b;
  }

  .dest-tag {
    color: #6ee7b7;
  }

  .route-count-badge {
    background: rgba(56, 189, 248, 0.16);
    color: #38bdf8;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .migrant-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .migrant-chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e0;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
  }

  .migrant-chip:hover {
    background: rgba(56, 189, 248, 0.25);
    color: #ffffff;
  }

  .text-muted {
    color: #94a3b8;
  }
</style>
