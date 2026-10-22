<script lang="ts">
  import { _ } from 'svelte-i18n'
  import { cleanName, formatLifespan, fuzzyMatchesQuery } from './common'

  export let individuals: Individual[] = []
  export let families: Family[] = []
  export let sources: Record<string, SourceRecord> = {}
  export let repositories: Record<string, RepositoryRecord> = {}
  export let media: Record<string, MediaRecord> = {}
  export let selectedIndividualId: string = ''
  export let onExploreInTree: (() => void) | null = null

  type EntityView = 'individuals' | 'sources' | 'repositories' | 'media'
  type VitalFilter = 'ALL' | 'LIVING' | 'DECEASED'
  type SortOrder = 'id' | 'name' | 'birth_asc' | 'birth_desc'

  let entityView: EntityView = 'individuals'
  let searchQuery = ''
  let genderFilter: 'ALL' | 'M' | 'F' = 'ALL'
  let vitalFilter: VitalFilter = 'ALL'
  let withSourcesOnly = false
  let withMediaOnly = false
  let yearFromInput = ''
  let yearToInput = ''
  let sortOrder: SortOrder = 'id'

  let selectedSourceId = ''
  let selectedRepoId = ''
  let selectedMediaId = ''

  const CURRENT_YEAR = new Date().getFullYear()

  // Map of individuals and families by ID for O(1) lookups
  $: indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))
  $: famMap = new Map<string, Family>(families.map((f) => [f.id, f]))

  $: sourceList = Object.values(sources)
  $: repoList = Object.values(repositories)
  $: mediaList = Object.values(media)

  $: {
    if (selectedSourceId.length === 0 && sourceList.length > 0) {
      selectedSourceId = sourceList[0].id
    }
    if (selectedRepoId.length === 0 && repoList.length > 0) {
      selectedRepoId = repoList[0].id
    }
    if (selectedMediaId.length === 0 && mediaList.length > 0) {
      selectedMediaId = mediaList[0].id
    }
  }

  function isPresumedDeceased(indi: Individual): boolean {
    const hasExplicitDeath =
      indi.death !== undefined || indi.events.some((e) => e.type === 'DEAT' || e.type === 'BURI' || e.type === 'CREM')
    if (hasExplicitDeath) return true
    const birthYear = indi.birth?.year
    return birthYear !== undefined && CURRENT_YEAR - birthYear > 115
  }

  function hasAnyCitation(indi: Individual): boolean {
    if (indi.citations.length > 0) return true
    return indi.events.some((e) => e.citations.length > 0)
  }

  function hasAnyMedia(indi: Individual): boolean {
    if (indi.mediaIds.length > 0) return true
    for (const famId of indi.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined && fam.mediaIds.length > 0) return true
    }
    return false
  }

  $: parsedYearFrom = yearFromInput.trim().length > 0 ? Number.parseInt(yearFromInput.trim(), 10) : Number.NaN
  $: parsedYearTo = yearToInput.trim().length > 0 ? Number.parseInt(yearToInput.trim(), 10) : Number.NaN

  $: filteredIndividuals = (() => {
    const list = individuals.filter((indi) => {
      if (genderFilter !== 'ALL' && indi.sex !== genderFilter) return false
      if (vitalFilter === 'LIVING' && isPresumedDeceased(indi)) return false
      if (vitalFilter === 'DECEASED' && !isPresumedDeceased(indi)) return false
      if (withSourcesOnly && !hasAnyCitation(indi)) return false
      if (withMediaOnly && !hasAnyMedia(indi)) return false

      if (!Number.isNaN(parsedYearFrom)) {
        if (indi.birth?.year === undefined || indi.birth.year < parsedYearFrom) return false
      }
      if (!Number.isNaN(parsedYearTo)) {
        if (indi.birth?.year === undefined || indi.birth.year > parsedYearTo) return false
      }

      if (searchQuery.trim().length === 0) return true

      const eventPlacesAndValues = indi.events.flatMap((ev) => [ev.place, ev.value, ev.cause, ev.notes])
      return fuzzyMatchesQuery(
        [
          indi.id,
          indi.name,
          indi.givenName,
          indi.surname,
          indi.nick,
          indi.marriedName,
          indi.birth?.place,
          indi.birth?.date,
          indi.death?.place,
          indi.death?.date,
          indi.notes,
          ...eventPlacesAndValues
        ],
        searchQuery
      )
    })

    const sorted = [...list]
    if (sortOrder === 'name') {
      sorted.sort((a, b) => cleanName(a.name).localeCompare(cleanName(b.name)))
    } else if (sortOrder === 'birth_asc') {
      sorted.sort((a, b) => (a.birth?.year ?? 99999) - (b.birth?.year ?? 99999))
    } else if (sortOrder === 'birth_desc') {
      sorted.sort((a, b) => (b.birth?.year ?? -99999) - (a.birth?.year ?? -99999))
    }
    return sorted
  })()

  $: filteredSources = sourceList.filter((src) => {
    if (searchQuery.trim().length === 0) return true
    const repoName = typeof src.repositoryId === 'string' ? repositories[src.repositoryId]?.name : undefined
    return fuzzyMatchesQuery([src.id, src.title, src.author, src.publication, src.notes, repoName], searchQuery)
  })

  $: filteredRepos = repoList.filter((repo) => {
    if (searchQuery.trim().length === 0) return true
    return fuzzyMatchesQuery([repo.id, repo.name, repo.address, repo.email, repo.phone, repo.notes], searchQuery)
  })

  $: filteredMedia = mediaList.filter((m) => {
    if (searchQuery.trim().length === 0) return true
    return fuzzyMatchesQuery([m.id, m.title, m.format, m.filePath, m.notes], searchQuery)
  })

  $: selectedPerson = indiMap.get(selectedIndividualId)

  interface TimelineItem {
    id: string
    type: string
    date?: string
    place?: string
    year?: number
    age?: number
    value?: string
    cause?: string
    notes?: string
    spouseName?: string
    citations: Citation[]
  }

  // Build chronological life timeline for selectedPerson
  $: personTimeline = (() => {
    if (selectedPerson === undefined) return []
    const items: TimelineItem[] = []
    const birthYear = selectedPerson.birth?.year

    const computeAge = (evYear?: number, evType?: string): number | undefined => {
      if (evType === 'BIRT' || birthYear === undefined || evYear === undefined) return undefined
      const diff = evYear - birthYear
      return diff >= 0 && diff <= 130 ? diff : undefined
    }

    let hasExplicitBirt = false
    let hasExplicitDeat = false

    for (let idx = 0; idx < selectedPerson.events.length; idx++) {
      const ev = selectedPerson.events[idx]
      if (ev.type === 'BIRT') hasExplicitBirt = true
      if (ev.type === 'DEAT') hasExplicitDeat = true
      const hasContent =
        (ev.date?.length ?? 0) > 0 ||
        (ev.place?.length ?? 0) > 0 ||
        (ev.value?.length ?? 0) > 0 ||
        (ev.cause?.length ?? 0) > 0 ||
        (ev.notes?.length ?? 0) > 0 ||
        ev.citations.length > 0

      if (hasContent) {
        items.push({
          id: `indi-ev-${idx}`,
          type: ev.type,
          date: ev.date,
          place: ev.place,
          year: ev.year,
          age: computeAge(ev.year, ev.type),
          value: ev.value,
          cause: ev.cause,
          notes: ev.notes,
          citations: ev.citations
        })
      }
    }

    if (!hasExplicitBirt && selectedPerson.birth !== undefined) {
      const b = selectedPerson.birth
      if ((b.date?.length ?? 0) > 0 || (b.place?.length ?? 0) > 0) {
        items.push({
          id: 'fallback-birt',
          type: b.type ?? 'BIRT',
          date: b.date,
          place: b.place,
          year: b.year,
          citations: []
        })
      }
    }

    if (!hasExplicitDeat && selectedPerson.death !== undefined) {
      const d = selectedPerson.death
      if ((d.date?.length ?? 0) > 0 || (d.place?.length ?? 0) > 0) {
        items.push({
          id: 'fallback-deat',
          type: d.type ?? 'DEAT',
          date: d.date,
          place: d.place,
          year: d.year,
          age: computeAge(d.year, 'DEAT'),
          citations: []
        })
      }
    }

    // Include marriage & family events from fams
    for (const famId of selectedPerson.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined) {
        const sp = getSpouse(fam, selectedPerson.id)
        const spName = sp !== undefined ? cleanName(sp.name) : undefined
        if (fam.events.length > 0) {
          for (let fIdx = 0; fIdx < fam.events.length; fIdx++) {
            const fev = fam.events[fIdx]
            items.push({
              id: `fam-ev-${fam.id}-${fIdx}`,
              type: fev.type,
              date: fev.date,
              place: fev.place,
              year: fev.year,
              age: computeAge(fev.year, fev.type),
              value: fev.value,
              cause: fev.cause,
              notes: fev.notes,
              spouseName: spName,
              citations: fev.citations
            })
          }
        } else if (fam.marriage !== undefined) {
          items.push({
            id: `fam-marr-${fam.id}`,
            type: 'MARR',
            date: fam.marriage.date,
            place: fam.marriage.place,
            year: fam.marriage.year,
            age: computeAge(fam.marriage.year, 'MARR'),
            spouseName: spName,
            citations: fam.citations
          })
        }
      }
    }

    const typeOrderWeight = (type: string): number => {
      if (type === 'BIRT') return 1
      if (type === 'CHR' || type === 'BAPM' || type === 'BLES' || type === 'ADOP') return 2
      if (type === 'ENGA' || type === 'MARB' || type === 'MARC' || type === 'MARL') return 40
      if (type === 'MARR' || type === 'MARS') return 45
      if (type === 'SEPR' || type === 'DIVF' || type === 'DIV' || type === 'ANUL') return 60
      if (type === 'DEAT') return 90
      if (type === 'BURI' || type === 'CREM') return 95
      return 50
    }

    items.sort((a, b) => {
      if (a.year !== undefined && b.year !== undefined && a.year !== b.year) {
        return a.year - b.year
      }
      return typeOrderWeight(a.type) - typeOrderWeight(b.type)
    })

    return items
  })()

  // Media attached to the selected person or their marriages
  $: personMedia = (() => {
    if (selectedPerson === undefined) return []
    const ids = new Set<string>(selectedPerson.mediaIds)
    for (const famId of selectedPerson.fams) {
      const fam = famMap.get(famId)
      if (fam !== undefined) {
        for (const mId of fam.mediaIds) ids.add(mId)
      }
    }
    const list: MediaRecord[] = []
    for (const id of ids) {
      const m = media[id]
      if (m !== undefined) list.push(m)
    }
    return list
  })()

  // Individuals citing a given source ID
  function getIndividualsForSource(sourceId: string): Individual[] {
    return individuals.filter(
      (indi) =>
        indi.citations.some((c) => c.sourceId === sourceId) ||
        indi.events.some((ev) => ev.citations.some((c) => c.sourceId === sourceId))
    )
  }

  // Sources housed in a given repository ID
  function getSourcesForRepo(repoId: string): SourceRecord[] {
    return sourceList.filter((s) => s.repositoryId === repoId)
  }

  // Individuals linked to a given media ID
  function getIndividualsForMedia(mediaId: string): Individual[] {
    return individuals.filter((indi) => {
      if (indi.mediaIds.includes(mediaId)) return true
      return indi.fams.some((fId) => famMap.get(fId)?.mediaIds.includes(mediaId) ?? false)
    })
  }

  function getEventIcon(type: string): string {
    switch (type) {
      case 'BIRT':
      case 'ADOP':
        return '👶'
      case 'CHR':
      case 'CHRA':
      case 'BAPM':
      case 'BARM':
      case 'BASM':
      case 'BLES':
      case 'CONF':
      case 'FCOM':
      case 'ORDN':
        return '⛪'
      case 'ENGA':
      case 'MARB':
      case 'MARC':
      case 'MARL':
      case 'MARS':
        return '💎'
      case 'MARR':
        return '💍'
      case 'DIV':
      case 'DIVF':
      case 'ANUL':
      case 'SEPR':
        return '💔'
      case 'OCCU':
        return '💼'
      case 'RESI':
        return '🏠'
      case 'EDUC':
      case 'GRAD':
        return '🎓'
      case 'IMMI':
      case 'EMIG':
      case 'NATU':
        return '⛵'
      case 'CENS':
      case 'PROB':
      case 'WILL':
        return '📜'
      case 'RETI':
        return '🏖️'
      case 'DEAT':
        return '🕊️'
      case 'BURI':
      case 'CREM':
        return '⚰️'
      default:
        return '📌'
    }
  }

  function selectPerson(id: string): void {
    selectedIndividualId = id
    entityView = 'individuals'
  }

  function inspectSource(sourceId: string): void {
    if (sources[sourceId] !== undefined) {
      selectedSourceId = sourceId
      entityView = 'sources'
    }
  }

  function inspectRepo(repoId: string): void {
    if (repositories[repoId] !== undefined) {
      selectedRepoId = repoId
      entityView = 'repositories'
    }
  }

  function inspectMedia(mediaId: string): void {
    if (media[mediaId] !== undefined) {
      selectedMediaId = mediaId
      entityView = 'media'
    }
  }

  function getSpouse(fam: Family, personId: string): Individual | undefined {
    const spouseId = fam.husbandId === personId ? fam.wifeId : fam.husbandId
    return typeof spouseId === 'string' && spouseId.length > 0 ? indiMap.get(spouseId) : undefined
  }
</script>

<div class="records-container">
  <!-- Entity Category Sub-Tabs -->
  <div class="entity-subtabs" role="tablist">
    <button
      class="subtab-btn"
      class:active={entityView === 'individuals'}
      data-testid="records-subtab-individuals"
      on:click={() => {
        entityView = 'individuals'
      }}
    >
      👥 {$_('records.tab_individuals')} <span class="subtab-count">{individuals.length}</span>
    </button>
    <button
      class="subtab-btn"
      class:active={entityView === 'sources'}
      data-testid="records-subtab-sources"
      on:click={() => {
        entityView = 'sources'
      }}
    >
      📚 {$_('records.tab_sources')} <span class="subtab-count">{sourceList.length}</span>
    </button>
    <button
      class="subtab-btn"
      class:active={entityView === 'repositories'}
      data-testid="records-subtab-repositories"
      on:click={() => {
        entityView = 'repositories'
      }}
    >
      🏛️ {$_('records.tab_repositories')} <span class="subtab-count">{repoList.length}</span>
    </button>
    <button
      class="subtab-btn"
      class:active={entityView === 'media'}
      data-testid="records-subtab-media"
      on:click={() => {
        entityView = 'media'
      }}
    >
      🖼️ {$_('records.tab_media')} <span class="subtab-count">{mediaList.length}</span>
    </button>
  </div>

  <!-- Search and filter controls -->
  <div class="controls-bar">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        placeholder={$_('main_page.search_placeholder')}
        bind:value={searchQuery}
        class="search-input"
        data-testid="search-records-input"
      />
      {#if searchQuery.length > 0}
        <button
          class="clear-btn"
          on:click={() => {
            searchQuery = ''
          }}
        >
          ✕
        </button>
      {/if}
    </div>

    {#if entityView === 'individuals'}
      <div class="filter-group">
        <button
          class="filter-btn"
          class:active={genderFilter === 'ALL'}
          on:click={() => {
            genderFilter = 'ALL'
          }}
        >
          {$_('main_page.filter_all')} ({filteredIndividuals.length})
        </button>
        <button
          class="filter-btn male"
          class:active={genderFilter === 'M'}
          on:click={() => {
            genderFilter = 'M'
          }}
        >
          ♂ {$_('main_page.filter_males')}
        </button>
        <button
          class="filter-btn female"
          class:active={genderFilter === 'F'}
          on:click={() => {
            genderFilter = 'F'
          }}
        >
          ♀ {$_('main_page.filter_females')}
        </button>
      </div>

      <!-- Advanced Filters Row -->
      <div class="advanced-filters">
        <select class="adv-select" bind:value={vitalFilter} data-testid="vital-status-select">
          <option value="ALL">{$_('records.vital_all')}</option>
          <option value="LIVING">{$_('records.vital_living')}</option>
          <option value="DECEASED">{$_('records.vital_deceased')}</option>
        </select>

        <input
          type="number"
          class="year-input"
          placeholder={$_('records.year_from')}
          bind:value={yearFromInput}
          data-testid="year-from-input"
        />
        <input
          type="number"
          class="year-input"
          placeholder={$_('records.year_to')}
          bind:value={yearToInput}
          data-testid="year-to-input"
        />

        <button
          class="chip-toggle"
          class:active={withSourcesOnly}
          data-testid="filter-with-sources-btn"
          on:click={() => {
            withSourcesOnly = !withSourcesOnly
          }}
        >
          📚 {$_('records.filter_with_sources')}
        </button>

        <button
          class="chip-toggle"
          class:active={withMediaOnly}
          data-testid="filter-with-media-btn"
          on:click={() => {
            withMediaOnly = !withMediaOnly
          }}
        >
          🖼️ {$_('records.filter_with_media')}
        </button>

        <select class="adv-select" bind:value={sortOrder} data-testid="records-sort-select">
          <option value="id">{$_('records.sort_id')}</option>
          <option value="name">{$_('records.sort_name')}</option>
          <option value="birth_asc">{$_('records.sort_birth_asc')}</option>
          <option value="birth_desc">{$_('records.sort_birth_desc')}</option>
        </select>
      </div>
    {/if}
  </div>

  {#if entityView === 'individuals'}
    <div class="records-layout">
      <!-- Individuals Table -->
      <div class="table-wrapper">
        <table class="records-table">
          <thead>
            <tr>
              <th style="width: 70px">ID</th>
              <th>{$_('records.name')}</th>
              <th style="width: 50px">{$_('records.sex')}</th>
              <th>{$_('main_page.birth')}</th>
              <th>{$_('main_page.death')}</th>
            </tr>
          </thead>
          <tbody>
            {#if filteredIndividuals.length === 0}
              <tr>
                <td colspan="5" class="empty-cell">
                  {$_('main_page.no_records_found')}
                </td>
              </tr>
            {:else}
              {#each filteredIndividuals.slice(0, 100) as indi (indi.id)}
                <tr
                  class="record-row"
                  class:selected={indi.id === selectedIndividualId}
                  on:click={() => {
                    selectPerson(indi.id)
                  }}
                >
                  <td class="id-cell">{indi.id}</td>
                  <td class="name-cell">
                    <span class="person-name">{cleanName(indi.name)}</span>
                    {#if hasAnyCitation(indi)}
                      <span class="mini-indicator" title={$_('records.citations')}>📚</span>
                    {/if}
                    {#if hasAnyMedia(indi)}
                      <span class="mini-indicator" title={$_('records.media_gallery')}>🖼️</span>
                    {/if}
                  </td>
                  <td class="sex-cell">
                    {#if indi.sex === 'M'}
                      <span class="sex-badge m">♂</span>
                    {:else if indi.sex === 'F'}
                      <span class="sex-badge f">♀</span>
                    {:else}
                      <span class="sex-badge u">?</span>
                    {/if}
                  </td>
                  <td class="event-cell">
                    {#if indi.birth?.date !== undefined || indi.birth?.place !== undefined}
                      <span>{indi.birth?.date ?? ''} {typeof indi.birth?.place === 'string' && indi.birth.place.length > 0 ? `(${indi.birth.place})` : ''}</span>
                    {:else}
                      <span class="text-muted">—</span>
                    {/if}
                  </td>
                  <td class="event-cell">
                    {#if indi.death?.date !== undefined || indi.death?.place !== undefined}
                      <span>{indi.death?.date ?? ''} {typeof indi.death?.place === 'string' && indi.death.place.length > 0 ? `(${indi.death.place})` : ''}</span>
                    {:else}
                      <span class="text-muted">—</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
        {#if filteredIndividuals.length > 100}
          <div class="table-footer-notice">
            {$_({ id: 'records.showing_first_n', values: { total: filteredIndividuals.length } })}
          </div>
        {/if}
      </div>

      <!-- Inspector Panel -->
      <div class="inspector-panel">
        {#if selectedPerson !== undefined}
          <div class="inspector-card">
            <div class="inspector-header">
              <div class="avatar-large" class:male={selectedPerson.sex === 'M'} class:female={selectedPerson.sex === 'F'}>
                {selectedPerson.sex === 'M' ? '♂' : selectedPerson.sex === 'F' ? '♀' : '👤'}
              </div>
              <div class="inspector-header-info">
                <h3 class="inspector-title">{cleanName(selectedPerson.name)}</h3>
                <div class="inspector-subtitle">
                  {selectedPerson.id} &bull; {formatLifespan(selectedPerson.birth, selectedPerson.death)}
                </div>
                {#if typeof selectedPerson.nick === 'string' && selectedPerson.nick.length > 0}
                  <div class="inspector-alias">“{selectedPerson.nick}”</div>
                {/if}
              </div>
              {#if onExploreInTree !== null}
                <button class="tree-jump-btn" data-testid="inspector-view-in-tree-btn" on:click={onExploreInTree}>
                  🌿 {$_('records.view_in_tree')}
                </button>
              {/if}
            </div>

            <!-- Interactive Chronological Life Timeline -->
            <div class="inspector-section">
              <div class="section-heading">⏳ {$_('records.timeline')} ({personTimeline.length})</div>
              {#if personTimeline.length === 0}
                <div class="event-item text-muted">—</div>
              {:else}
                <div class="timeline-list" data-testid="inspector-timeline">
                  {#each personTimeline as item (item.id)}
                    <div class="timeline-item" data-testid="timeline-event-item">
                      <div class="timeline-marker">
                        <span class="timeline-icon">{getEventIcon(item.type)}</span>
                      </div>
                      <div class="timeline-body">
                        <div class="timeline-header-row">
                          <span class="event-label">{$_(`records.event_types.${item.type}`, { default: item.type })}</span>
                          <div class="timeline-badges">
                            {#if item.year !== undefined}
                              <span class="year-badge">{item.year}</span>
                            {/if}
                            {#if item.age !== undefined}
                              <span class="age-badge">{$_({ id: 'records.age_at_event', values: { age: item.age } })}</span>
                            {/if}
                          </div>
                        </div>

                        <div class="timeline-details">
                          {#if typeof item.value === 'string' && item.value.length > 0}
                            <div class="timeline-val">{item.value}</div>
                          {/if}
                          {#if typeof item.spouseName === 'string' && item.spouseName.length > 0}
                            <div class="timeline-spouse">💍 {item.spouseName}</div>
                          {/if}
                          {#if typeof item.date === 'string' && item.date.length > 0}
                            <span class="timeline-date">📅 {item.date}</span>
                          {/if}
                          {#if typeof item.place === 'string' && item.place.length > 0}
                            <span class="timeline-place">📍 {item.place}</span>
                          {/if}
                          {#if typeof item.cause === 'string' && item.cause.length > 0}
                            <span class="timeline-cause">[{item.cause}]</span>
                          {/if}
                          {#if typeof item.notes === 'string' && item.notes.length > 0}
                            <div class="timeline-note">📝 {item.notes}</div>
                          {/if}
                        </div>

                        {#if item.citations.length > 0}
                          <div class="timeline-citations">
                            {#each item.citations as cit}
                              {@const srcRecord = sources[cit.sourceId]}
                              <div class="citation-pill-box">
                                <button
                                  class="citation-source-btn"
                                  on:click={() => {
                                    inspectSource(cit.sourceId)
                                  }}
                                >
                                  📚 {srcRecord?.title ?? cit.sourceId}
                                </button>
                                {#if typeof cit.page === 'string' && cit.page.length > 0}
                                  <span class="citation-page">{cit.page}</span>
                                {/if}
                                {#if cit.quay !== undefined}
                                  <span class="quay-badge q-{cit.quay}">
                                    {$_(`records.quay_${cit.quay}`, { default: `QUAY ${cit.quay}` })}
                                  </span>
                                {/if}
                                {#if typeof cit.text === 'string' && cit.text.length > 0}
                                  <blockquote class="citation-excerpt">“{cit.text}”</blockquote>
                                {/if}
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Multimedia Gallery Attachments -->
            {#if personMedia.length > 0}
              <div class="inspector-section" data-testid="inspector-media-section">
                <div class="section-heading">🖼️ {$_('records.media_gallery')} ({personMedia.length})</div>
                <div class="media-mini-grid">
                  {#each personMedia as m (m.id)}
                    <button
                      class="media-mini-card"
                      on:click={() => {
                        inspectMedia(m.id)
                      }}
                    >
                      <span class="media-format-badge">{m.format ?? 'FILE'}</span>
                      <div class="media-mini-info">
                        <div class="media-mini-title">{m.title ?? m.id}</div>
                        {#if typeof m.filePath === 'string' && m.filePath.length > 0}
                          <div class="media-mini-path">{m.filePath}</div>
                        {/if}
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Family Links -->
            {#if selectedPerson.famc.length > 0}
              <div class="inspector-section">
                <div class="section-heading">{$_('main_page.parents')}</div>
                {#each selectedPerson.famc as famId}
                  {@const fam = famMap.get(famId)}
                  {#if fam !== undefined}
                    <div class="family-unit">
                      {#if typeof fam.husbandId === 'string' && fam.husbandId.length > 0}
                        {@const f = indiMap.get(fam.husbandId)}
                        <button
                          class="link-btn"
                          on:click={() => {
                            selectPerson(fam.husbandId ?? '')
                          }}
                        >
                          👨 {cleanName(f?.name)} <small>{formatLifespan(f?.birth, f?.death)}</small>
                        </button>
                      {/if}
                      {#if typeof fam.wifeId === 'string' && fam.wifeId.length > 0}
                        {@const m = indiMap.get(fam.wifeId)}
                        <button
                          class="link-btn"
                          on:click={() => {
                            selectPerson(fam.wifeId ?? '')
                          }}
                        >
                          👩 {cleanName(m?.name)} <small>{formatLifespan(m?.birth, m?.death)}</small>
                        </button>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

            {#if selectedPerson.fams.length > 0}
              <div class="inspector-section">
                <div class="section-heading">{$_('main_page.spouses')} & {$_('main_page.children')}</div>
                {#each selectedPerson.fams as famId}
                  {@const fam = famMap.get(famId)}
                  {#if fam !== undefined}
                    <div class="family-unit">
                      {#if getSpouse(fam, selectedPerson.id) !== undefined}
                        {@const spouse = getSpouse(fam, selectedPerson.id)}
                        <div class="spouse-box">
                          <span class="role-tag">💍 {$_('records.spouse')}:</span>
                          <button
                            class="link-btn inline"
                            on:click={() => {
                              selectPerson(spouse?.id ?? '')
                            }}
                          >
                            {cleanName(spouse?.name)} <small>{formatLifespan(spouse?.birth, spouse?.death)}</small>
                          </button>
                        </div>
                      {/if}

                      {#if fam.childrenIds.length > 0}
                        <div class="children-list">
                          <span class="role-tag">👶 {$_('records.children')} ({fam.childrenIds.length}):</span>
                          {#each fam.childrenIds as childId}
                            {@const ch = indiMap.get(childId)}
                            <button
                              class="link-btn child-item"
                              on:click={() => {
                                selectPerson(childId)
                              }}
                            >
                              {ch?.sex === 'M' ? '👦' : '👧'}
                              {cleanName(ch?.name)} <small>{formatLifespan(ch?.birth, ch?.death)}</small>
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/each}
              </div>
            {/if}

            {#if typeof selectedPerson.notes === 'string' && selectedPerson.notes.length > 0}
              <div class="inspector-section">
                <div class="section-heading">{$_('main_page.notes')}</div>
                <div class="notes-content">{selectedPerson.notes}</div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="inspector-empty">
            <div class="empty-icon">👆</div>
            <p>{$_('main_page.no_selection')}</p>
          </div>
        {/if}
      </div>
    </div>
  {:else if entityView === 'sources'}
    <!-- Sources Explorer View -->
    <div class="entity-grid" data-testid="sources-explorer-grid">
      {#each filteredSources as src (src.id)}
        {@const repo = typeof src.repositoryId === 'string' ? repositories[src.repositoryId] : undefined}
        {@const citingPeople = getIndividualsForSource(src.id)}
        <div class="entity-card" class:highlighted={src.id === selectedSourceId} data-testid="source-card">
          <div class="entity-card-header">
            <span class="entity-id-badge">{src.id}</span>
            <h4 class="entity-card-title">{src.title ?? src.id}</h4>
          </div>
          <div class="entity-meta-list">
            {#if typeof src.author === 'string' && src.author.length > 0}
              <div><strong>{$_('records.author')}:</strong> {src.author}</div>
            {/if}
            {#if typeof src.publication === 'string' && src.publication.length > 0}
              <div><strong>{$_('records.publication')}:</strong> {src.publication}</div>
            {/if}
            {#if repo !== undefined}
              <div>
                <strong>{$_('records.repository')}:</strong>
                <button
                  class="inline-entity-link"
                  on:click={() => {
                    inspectRepo(repo.id)
                  }}
                >
                  🏛️ {repo.name ?? repo.id}
                </button>
              </div>
            {/if}
          </div>
          {#if citingPeople.length > 0}
            <div class="entity-refs">
              <div class="section-heading">{$_('records.referenced_by')} ({citingPeople.length})</div>
              <div class="ref-chips">
                {#each citingPeople.slice(0, 12) as person (person.id)}
                  <button
                    class="ref-chip"
                    on:click={() => {
                      selectPerson(person.id)
                    }}
                  >
                    {cleanName(person.name)}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else if entityView === 'repositories'}
    <!-- Repositories Explorer View -->
    <div class="entity-grid" data-testid="repositories-explorer-grid">
      {#each filteredRepos as repo (repo.id)}
        {@const housedSources = getSourcesForRepo(repo.id)}
        <div class="entity-card" class:highlighted={repo.id === selectedRepoId} data-testid="repository-card">
          <div class="entity-card-header">
            <span class="entity-id-badge">{repo.id}</span>
            <h4 class="entity-card-title">🏛️ {repo.name ?? repo.id}</h4>
          </div>
          <div class="entity-meta-list">
            {#if typeof repo.address === 'string' && repo.address.length > 0}
              <div><strong>{$_('records.address')}:</strong> 📍 {repo.address}</div>
            {/if}
            {#if typeof repo.phone === 'string' && repo.phone.length > 0}
              <div>📞 {repo.phone}</div>
            {/if}
            {#if typeof repo.email === 'string' && repo.email.length > 0}
              <div>✉️ {repo.email}</div>
            {/if}
          </div>
          {#if housedSources.length > 0}
            <div class="entity-refs">
              <div class="section-heading">{$_('records.housed_sources')} ({housedSources.length})</div>
              <div class="ref-chips">
                {#each housedSources as s (s.id)}
                  <button
                    class="ref-chip"
                    on:click={() => {
                      inspectSource(s.id)
                    }}
                  >
                    📚 {s.title ?? s.id}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else if entityView === 'media'}
    <!-- Multimedia Gallery Explorer View -->
    <div class="entity-grid" data-testid="media-explorer-grid">
      {#each filteredMedia as m (m.id)}
        {@const linkedPeople = getIndividualsForMedia(m.id)}
        <div class="entity-card media-card" class:highlighted={m.id === selectedMediaId} data-testid="media-card">
          <div class="media-preview-banner">
            <span class="media-banner-icon">{m.format === 'PDF' ? '📄' : '🖼️'}</span>
            <span class="media-format-pill">{m.format ?? 'OBJE'}</span>
          </div>
          <div class="entity-card-header">
            <span class="entity-id-badge">{m.id}</span>
            <h4 class="entity-card-title">{m.title ?? m.id}</h4>
          </div>
          <div class="entity-meta-list">
            {#if typeof m.filePath === 'string' && m.filePath.length > 0}
              <div><strong>{$_('records.file_path')}:</strong> <code>{m.filePath}</code></div>
            {/if}
            {#if typeof m.notes === 'string' && m.notes.length > 0}
              <div>{m.notes}</div>
            {/if}
          </div>
          {#if linkedPeople.length > 0}
            <div class="entity-refs">
              <div class="section-heading">{$_('records.referenced_by')} ({linkedPeople.length})</div>
              <div class="ref-chips">
                {#each linkedPeople as person (person.id)}
                  <button
                    class="ref-chip"
                    on:click={() => {
                      selectPerson(person.id)
                    }}
                  >
                    {cleanName(person.name)}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .records-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .entity-subtabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 12px;
  }

  .subtab-btn {
    background: rgba(26, 32, 44, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e0;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
  }

  .subtab-btn:hover {
    background: rgba(49, 130, 206, 0.2);
    color: #ffffff;
  }

  .subtab-btn.active {
    background: #2b6cb0;
    border-color: #4299e1;
    color: #ffffff;
  }

  .subtab-count {
    background: rgba(0, 0, 0, 0.35);
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 11px;
  }

  .controls-bar {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 240px;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    font-size: 14px;
    color: #718096;
  }

  .search-input {
    width: 100%;
    background: rgba(26, 32, 44, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 9px 36px;
    color: #edf2f7;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .search-input:focus {
    border-color: #3182ce;
  }

  .clear-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    color: #a0aec0;
    cursor: pointer;
    font-size: 12px;
  }

  .filter-group {
    display: flex;
    gap: 6px;
  }

  .filter-btn {
    background: rgba(26, 32, 44, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #a0aec0;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .filter-btn.active {
    background: #2b6cb0;
    color: #ffffff;
    border-color: #3182ce;
  }

  .advanced-filters {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .adv-select,
  .year-input {
    background: rgba(26, 32, 44, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 6px 10px;
    color: #e2e8f0;
    font-size: 12.5px;
    outline: none;
  }

  .year-input {
    width: 105px;
  }

  .chip-toggle {
    background: rgba(26, 32, 44, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 6px 12px;
    color: #cbd5e0;
    font-size: 12.5px;
    cursor: pointer;
  }

  .chip-toggle.active {
    background: rgba(49, 130, 206, 0.3);
    border-color: #4299e1;
    color: #ffffff;
  }

  .records-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 1150px) {
    .records-layout {
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: 14px;
    }
  }

  @media (max-width: 760px) {
    .records-layout {
      grid-template-columns: 1fr;
    }

    .inspector-panel {
      order: -1;
      position: static;
      max-height: 420px;
    }
  }

  .table-wrapper {
    background: rgba(26, 32, 44, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .records-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .records-table th {
    background: rgba(15, 23, 42, 0.8);
    padding: 12px 14px;
    text-align: left;
    color: #a0aec0;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .record-row {
    cursor: pointer;
    transition: background 0.15s ease;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .record-row:hover {
    background: rgba(49, 130, 206, 0.12);
  }

  .record-row.selected {
    background: rgba(49, 130, 206, 0.25);
  }

  .records-table td {
    padding: 10px 14px;
    color: #e2e8f0;
  }

  .id-cell {
    font-family: monospace;
    color: #a0aec0;
    font-size: 12px;
  }

  .person-name {
    font-weight: 600;
    color: #edf2f7;
  }

  .mini-indicator {
    margin-left: 6px;
    font-size: 11px;
    opacity: 0.85;
  }

  .sex-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
  }

  .sex-badge.m {
    color: #63b3ed;
  }

  .sex-badge.f {
    color: #f687b3;
  }

  .sex-badge.u {
    color: #a0aec0;
  }

  .text-muted {
    color: #718096;
  }

  .empty-cell {
    text-align: center;
    padding: 40px;
    color: #718096;
  }

  .table-footer-notice {
    padding: 10px 16px;
    font-size: 12px;
    color: #a0aec0;
    background: rgba(15, 23, 42, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    text-align: center;
  }

  .inspector-panel {
    background: rgba(26, 32, 44, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
    min-height: 350px;
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 120px);
    overflow-y: auto;
  }

  .inspector-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: #718096;
    text-align: center;
  }

  .empty-icon {
    font-size: 36px;
    margin-bottom: 12px;
  }

  .inspector-header {
    display: flex;
    gap: 12px;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .inspector-header-info {
    flex: 1;
    min-width: 160px;
  }

  .avatar-large {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }

  .avatar-large.male {
    background: rgba(49, 130, 206, 0.2);
    color: #63b3ed;
  }

  .avatar-large.female {
    background: rgba(213, 63, 140, 0.2);
    color: #f687b3;
  }

  .inspector-title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #edf2f7;
  }

  .inspector-subtitle {
    font-size: 12px;
    color: #a0aec0;
    margin-top: 2px;
  }

  .inspector-alias {
    font-size: 11.5px;
    color: #90cdf4;
    font-style: italic;
    margin-top: 2px;
  }

  .tree-jump-btn {
    background: rgba(49, 130, 206, 0.22);
    border: 1px solid rgba(66, 153, 225, 0.4);
    color: #90cdf4;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .tree-jump-btn:hover {
    background: rgba(49, 130, 206, 0.4);
    color: #ffffff;
  }

  .inspector-section {
    margin-bottom: 18px;
  }

  .section-heading {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #718096;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  /* Chronological Life Timeline */
  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-left: 2px solid rgba(66, 153, 225, 0.3);
    margin-left: 10px;
    padding-left: 14px;
  }

  .timeline-item {
    position: relative;
    background: rgba(15, 23, 42, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 10px 12px;
  }

  .timeline-marker {
    position: absolute;
    left: -25px;
    top: 10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #1e293b;
    border: 1px solid rgba(66, 153, 225, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
  }

  .timeline-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .timeline-badges {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .year-badge {
    background: rgba(49, 130, 206, 0.25);
    color: #90cdf4;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .age-badge {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e0;
    font-size: 10.5px;
    padding: 1px 6px;
    border-radius: 4px;
  }

  .timeline-details {
    font-size: 12.5px;
    color: #cbd5e0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .timeline-val {
    font-weight: 600;
    color: #f8fafc;
  }

  .timeline-spouse {
    color: #f687b3;
    font-weight: 500;
  }

  .timeline-date,
  .timeline-place {
    color: #94a3b8;
    font-size: 12px;
  }

  .timeline-cause {
    color: #feb2b2;
    font-size: 12px;
  }

  .timeline-note {
    font-size: 11.5px;
    color: #a0aec0;
    font-style: italic;
    margin-top: 2px;
  }

  .timeline-citations {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .citation-pill-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }

  .citation-source-btn {
    background: rgba(56, 189, 248, 0.14);
    border: 1px solid rgba(56, 189, 248, 0.3);
    color: #7dd3fc;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    cursor: pointer;
    text-align: left;
  }

  .citation-source-btn:hover {
    background: rgba(56, 189, 248, 0.28);
  }

  .citation-page {
    color: #94a3b8;
  }

  .quay-badge {
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
  }

  .citation-excerpt {
    margin: 2px 0 0 0;
    width: 100%;
    font-style: italic;
    color: #94a3b8;
    border-left: 2px solid rgba(148, 163, 184, 0.4);
    padding-left: 6px;
  }

  /* Media Mini Grid in Inspector */
  .media-mini-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .media-mini-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 8px 10px;
    color: #e2e8f0;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .media-mini-card:hover {
    border-color: #38bdf8;
  }

  .media-format-badge {
    background: #2563eb;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 6px;
    border-radius: 4px;
  }

  .media-mini-title {
    font-size: 12.5px;
    font-weight: 600;
  }

  .media-mini-path {
    font-size: 11px;
    color: #64748b;
    font-family: monospace;
  }

  /* Entity Grid for Sources, Repositories, Media */
  .entity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .entity-card {
    background: rgba(26, 32, 44, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .entity-card.highlighted {
    border-color: #38bdf8;
    box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.3);
  }

  .entity-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .entity-id-badge {
    background: rgba(49, 130, 206, 0.25);
    color: #63b3ed;
    font-family: monospace;
    font-size: 11.5px;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .entity-card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
  }

  .entity-meta-list {
    font-size: 13px;
    color: #cbd5e0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .inline-entity-link {
    background: none;
    border: none;
    color: #63b3ed;
    cursor: pointer;
    padding: 0;
    font-size: 13px;
    text-decoration: underline;
  }

  .entity-refs {
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .ref-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .ref-chip {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #90cdf4;
    border-radius: 14px;
    padding: 3px 10px;
    font-size: 11.5px;
    cursor: pointer;
  }

  .ref-chip:hover {
    background: rgba(49, 130, 206, 0.3);
    color: #ffffff;
  }

  .media-preview-banner {
    height: 76px;
    background: radial-gradient(circle, #1e293b 0%, #0f172a 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .media-banner-icon {
    font-size: 32px;
  }

  .media-format-pill {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #2563eb;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .event-item {
    font-size: 13px;
    margin-bottom: 4px;
    color: #cbd5e0;
  }

  .event-label {
    font-weight: 600;
    color: #e2e8f0;
  }

  .family-unit {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
  }

  .link-btn {
    background: none;
    border: none;
    color: #63b3ed;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    display: block;
    width: 100%;
  }

  .link-btn:hover {
    background: rgba(49, 130, 206, 0.15);
    text-decoration: underline;
  }

  .link-btn small {
    color: #a0aec0;
  }

  .role-tag {
    font-size: 12px;
    color: #a0aec0;
    margin-bottom: 4px;
    display: block;
  }

  .spouse-box {
    margin-bottom: 8px;
  }

  .children-list {
    margin-top: 6px;
    padding-left: 8px;
    border-left: 2px solid rgba(255, 255, 255, 0.1);
  }

  .child-item {
    margin-top: 2px;
  }

  .notes-content {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 6px;
    padding: 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #cbd5e0;
    max-height: 150px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
</style>
