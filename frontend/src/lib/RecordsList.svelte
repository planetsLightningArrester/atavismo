<script lang="ts">
  import { _ } from 'svelte-i18n'
  import { cleanName, formatLifespan } from './common'

  export let individuals: Individual[] = []
  export let families: Family[] = []
  export let selectedIndividualId: string = ''

  let searchQuery = ''
  let genderFilter: 'ALL' | 'M' | 'F' = 'ALL'

  // Map of individuals by ID for quick lookups
  $: indiMap = new Map<string, Individual>(individuals.map((i) => [i.id, i]))
  $: famMap = new Map<string, Family>(families.map((f) => [f.id, f]))

  $: filteredIndividuals = individuals.filter((indi) => {
    if (genderFilter !== 'ALL' && indi.sex !== genderFilter) return false
    if (searchQuery.trim().length === 0) return true

    const q = searchQuery.toLowerCase().trim()
    const nameMatch = typeof indi.name === 'string' && indi.name.toLowerCase().includes(q)
    const idMatch = indi.id.toLowerCase().includes(q)
    const surnameMatch = typeof indi.surname === 'string' && indi.surname.toLowerCase().includes(q)
    const birthPlaceMatch = typeof indi.birth?.place === 'string' && indi.birth.place.toLowerCase().includes(q)
    const deathPlaceMatch = typeof indi.death?.place === 'string' && indi.death.place.toLowerCase().includes(q)

    return nameMatch || idMatch || surnameMatch || birthPlaceMatch || deathPlaceMatch
  })

  $: selectedPerson = indiMap.get(selectedIndividualId)

  function selectPerson(id: string): void {
    selectedIndividualId = id
  }

  function getSpouse(fam: Family, personId: string): Individual | undefined {
    const spouseId = fam.husbandId === personId ? fam.wifeId : fam.husbandId
    return typeof spouseId === 'string' && spouseId.length > 0 ? indiMap.get(spouseId) : undefined
  }
</script>

<div class="records-container">
  <!-- Search and filter controls -->
  <div class="controls-bar">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" placeholder={$_('main_page.search_placeholder')} bind:value={searchQuery} class="search-input" data-testid="search-records-input" />
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

    <div class="filter-group">
      <button
        class="filter-btn"
        class:active={genderFilter === 'ALL'}
        on:click={() => {
          genderFilter = 'ALL'
        }}
      >
        {$_('main_page.filter_all')} ({individuals.length})
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
  </div>

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
            {#each filteredIndividuals.slice(0, 100) as indi}
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
          Showing first 100 of {filteredIndividuals.length} records. Use search to refine.
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
            <div>
              <h3 class="inspector-title">{cleanName(selectedPerson.name)}</h3>
              <div class="inspector-subtitle">
                {selectedPerson.id} &bull; {formatLifespan(selectedPerson.birth, selectedPerson.death)}
              </div>
            </div>
          </div>

          <div class="inspector-section">
            <div class="section-heading">{$_('records.events')}</div>
            <div class="event-item">
              <span class="event-label">{$_('main_page.birth')}:</span>
              <span>{selectedPerson.birth?.date ?? '—'} {typeof selectedPerson.birth?.place === 'string' && selectedPerson.birth.place.length > 0 ? `(${selectedPerson.birth.place})` : ''}</span>
            </div>
            <div class="event-item">
              <span class="event-label">{$_('main_page.death')}:</span>
              <span>{selectedPerson.death?.date ?? '—'} {typeof selectedPerson.death?.place === 'string' && selectedPerson.death.place.length > 0 ? `(${selectedPerson.death.place})` : ''}</span>
            </div>
            {#if (selectedPerson.events?.length ?? 0) > 0}
              {#each selectedPerson.events.filter(e => {
                const isPrimaryBirth = selectedPerson.birth !== undefined && (e.type === 'BIRT' || e.type === selectedPerson.birth.type)
                const isPrimaryDeath = selectedPerson.death !== undefined && (e.type === 'DEAT' || e.type === selectedPerson.death.type)
                const hasDetails = (e.value?.length ?? 0) > 0 || (e.date?.length ?? 0) > 0 || (e.place?.length ?? 0) > 0 || (e.cause?.length ?? 0) > 0
                return !isPrimaryBirth && !isPrimaryDeath && hasDetails
              }) as ev}
                <div class="event-item">
                  <span class="event-label">{$_(`records.event_types.${ev.type}`, { default: ev.type })}:</span>
                  <span>
                    {typeof ev.value === 'string' && ev.value.length > 0 ? `${ev.value} ` : ''}
                    {typeof ev.date === 'string' && ev.date.length > 0 ? `(${ev.date}) ` : ''}
                    {typeof ev.place === 'string' && ev.place.length > 0 ? `— ${ev.place} ` : ''}
                    {typeof ev.cause === 'string' && ev.cause.length > 0 ? `[${ev.cause}]` : ''}
                  </span>
                </div>
              {/each}
            {/if}
          </div>

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
</div>

<style>
  .records-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .controls-bar {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 250px;
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
    padding: 10px 36px 10px 36px;
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

  .records-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    align-items: start;
  }

  @media (max-width: 1024px) {
    .records-layout {
      grid-template-columns: 1fr;
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
    gap: 14px;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 16px;
    margin-bottom: 16px;
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

  .inspector-section {
    margin-bottom: 16px;
  }

  .section-heading {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    color: #718096;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .event-item {
    font-size: 13px;
    margin-bottom: 4px;
    color: #cbd5e0;
  }

  .event-label {
    font-weight: 600;
    color: #a0aec0;
    margin-right: 6px;
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
