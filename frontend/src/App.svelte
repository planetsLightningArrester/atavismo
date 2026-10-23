<script lang="ts">
  import './i18n'
  import { onMount } from 'svelte'
  import { _ } from 'svelte-i18n'
  import Header from './lib/Header.svelte'
  import MetricsCard from './lib/MetricsCard.svelte'
  import TreePreview from './lib/TreePreview.svelte'
  import RecordsList from './lib/RecordsList.svelte'
  import AnalyticsView from './lib/AnalyticsView.svelte'
  import Footer from './lib/Footer.svelte'
  import { recalculateStats } from './lib/common'
  import { Icon, Styles } from '@sveltestrap/sveltestrap'

  // Svelte generates innerHTML assignments breaking CSP "require-trusted-types-for 'script'" in production code
  if (
    'trustedTypes' in window &&
    window.trustedTypes !== null &&
    typeof window.trustedTypes === 'object' &&
    'createPolicy' in window.trustedTypes &&
    window.trustedTypes.createPolicy !== null &&
    window.trustedTypes.createPolicy instanceof Function
  ) {
    window.trustedTypes.createPolicy('default', {
      createHTML: (string: string) => string.replace(/</g, '<').replace(/>/g, '>'),
    })
  }

  $: {
    document.title = $_('main_page.title')
  }

  // App State
  let gedcomData: GedcomData | undefined
  let rawText = ''
  let loadedFileName = ''
  let loadedFilePath: string | undefined
  let isDirty = false
  let saveToastMessage = ''
  let activeTab: 'overview' | 'tree' | 'records' | 'analytics' | 'raw' = 'overview'
  let selectedIndividualId = ''
  let isLoading = false
  let errorMessage = ''
  let isDragging = false

  let isEditingMetadata = false
  let editSubmName = ''
  let editSubmAddress = ''
  let editSubmEmail = ''
  let editSubmPhone = ''
  let editSubmLang = ''
  let editMetaSource = ''
  let editMetaCorp = ''
  let editMetaNotes = ''

  function openMetadataModal(): void {
    if (gedcomData === undefined) return
    editSubmName = gedcomData.submitter?.name ?? gedcomData.metadata.submitter ?? ''
    editSubmAddress = gedcomData.submitter?.address ?? ''
    editSubmEmail = gedcomData.submitter?.email ?? ''
    editSubmPhone = gedcomData.submitter?.phone ?? ''
    editSubmLang = gedcomData.submitter?.language ?? gedcomData.metadata.language ?? ''
    editMetaSource = gedcomData.metadata.source ?? 'ATAVISMO'
    editMetaCorp = gedcomData.metadata.corporation ?? ''
    editMetaNotes = gedcomData.metadata.notes ?? ''
    isEditingMetadata = true
  }

  function saveMetadataModal(): void {
    if (gedcomData === undefined) return
    if (gedcomData.submitter === undefined) {
      gedcomData.submitter = {
        id: '@SUBM1@',
        name: editSubmName.trim(),
        address: editSubmAddress.trim(),
        email: editSubmEmail.trim(),
        phone: editSubmPhone.trim(),
        language: editSubmLang.trim(),
      }
    } else {
      gedcomData.submitter.name = editSubmName.trim()
      gedcomData.submitter.address = editSubmAddress.trim()
      gedcomData.submitter.email = editSubmEmail.trim()
      gedcomData.submitter.phone = editSubmPhone.trim()
      gedcomData.submitter.language = editSubmLang.trim()
    }
    gedcomData.metadata.submitter = editSubmName.trim()
    gedcomData.metadata.source = editMetaSource.trim()
    gedcomData.metadata.corporation = editMetaCorp.trim()
    gedcomData.metadata.notes = editMetaNotes.trim()
    if (editSubmLang.trim().length > 0) {
      gedcomData.metadata.language = editSubmLang.trim()
    }
    isEditingMetadata = false
    handleDatasetChanged()
  }

  onMount(() => {
    const handleKeydown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (gedcomData !== undefined) {
          void saveCurrentFile()
        }
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  })

  function handleDatasetChanged(): void {
    if (gedcomData === undefined) return
    isDirty = true
    gedcomData.stats = recalculateStats(
      gedcomData.individuals,
      gedcomData.families,
      gedcomData.sources,
      gedcomData.repositories,
      gedcomData.media
    )
    gedcomData = { ...gedcomData }
  }

  async function saveCurrentFile(): Promise<void> {
    if (gedcomData === undefined) return
    if (loadedFilePath !== undefined && loadedFilePath.length > 0 && !loadedFilePath.includes('sample_dataset.ged')) {
      isLoading = true
      try {
        const ser = await window.api.serializeGedcom(gedcomData)
        if (ser.success && typeof ser.content === 'string') {
          const res = await window.api.saveGedcomFile(loadedFilePath, ser.content)
          if (res.success) {
            isDirty = false
            saveToastMessage = $_('main_page.saved_successfully')
            setTimeout(() => {
              saveToastMessage = ''
            }, 3000)
          } else {
            errorMessage = res.error ?? $_('main_page.save_error')
          }
        }
      } catch (err: unknown) {
        errorMessage = err instanceof Error ? err.message : String(err)
      } finally {
        isLoading = false
      }
    } else {
      await saveAsFile()
    }
  }

  async function saveAsFile(): Promise<void> {
    if (gedcomData === undefined) return
    try {
      const defaultName = loadedFileName.length > 0 ? loadedFileName : 'family_tree.ged'
      const saveDialogRes = await window.api.saveFileDialog(defaultName)
      if (!saveDialogRes.canceled && typeof saveDialogRes.filePath === 'string') {
        isLoading = true
        const ser = await window.api.serializeGedcom(gedcomData)
        if (ser.success && typeof ser.content === 'string') {
          const res = await window.api.saveGedcomFile(saveDialogRes.filePath, ser.content)
          if (res.success) {
            loadedFilePath = saveDialogRes.filePath
            loadedFileName = saveDialogRes.filePath.split(/[/\\]/).pop() ?? 'family_tree.ged'
            isDirty = false
            saveToastMessage = $_('main_page.saved_successfully')
            setTimeout(() => {
              saveToastMessage = ''
            }, 3000)
          } else {
            errorMessage = res.error ?? $_('main_page.save_error')
          }
        }
      }
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : String(err)
    } finally {
      isLoading = false
    }
  }

  // Updates
  let update: Update | undefined
  const checkingForUpdates = false
  window.api
    .checkUpdates()
    .then((val) => {
      update = val
    })
    .catch((err) => {
      console.error('Error checking for updates:', err)
    })

  const onUpdateApp = async (): Promise<void> => {
    if (typeof update !== 'undefined') window.api.proceedWithUpdate(update)
  }

  function handleServerResponse(response: DataServerResponse, filename?: string, filePath?: string): void {
    isLoading = false
    isDirty = false
    if (response.error !== undefined) {
      errorMessage = response.error.message
      console.error('GEDCOM Parse Error:', response.error)
    } else if (response.result !== undefined) {
      errorMessage = ''
      gedcomData = response.result
      if (typeof filename === 'string' && filename.length > 0) loadedFileName = filename
      if (typeof filePath === 'string' && filePath.length > 0) loadedFilePath = filePath
      if (gedcomData.individuals.length > 0) {
        const connected = gedcomData.individuals.find((i) => i.famc.length > 0 && i.fams.length > 0)
        selectedIndividualId = connected?.id ?? gedcomData.individuals[0].id
      }
    }
  }

  async function loadSampleTree(): Promise<void> {
    isLoading = true
    errorMessage = ''
    try {
      const response = await window.api.loadSampleData()
      handleServerResponse(response, 'sample_dataset.ged')
      loadedFilePath = undefined
    } catch (err: unknown) {
      isLoading = false
      errorMessage = err instanceof Error ? err.message : String(err)
    }
  }

  function createNewProject(): void {
    if (gedcomData !== undefined && isDirty) {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm($_('main_page.confirm_unsaved_discard'))
      if (!confirmed) return
    }
    const defaultData: GedcomData = {
      metadata: {
        source: 'ATAVISMO',
        version: '1.0.0',
        name: 'New Family Tree',
        atavismVersion: '5.5.1',
        encoding: 'UTF-8',
        date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
        language: 'English',
        notes: 'Created with Atavismo Genealogy Suite',
      },
      individuals: [],
      families: [],
      sources: {},
      repositories: {},
      media: {},
      notes: {},
      submitter: {
        id: '@SUBM1@',
        name: 'New Submitter',
        address: '',
        email: '',
        phone: '',
        language: 'English',
      },
      diagnostics: [],
      stats: {
        totalIndividuals: 0,
        totalFamilies: 0,
        maleCount: 0,
        femaleCount: 0,
        unknownSexCount: 0,
        generationCount: 0,
        topSurnames: [],
        totalSources: 0,
        totalRepositories: 0,
        totalMedia: 0,
        totalEvents: 0,
        livingCount: 0,
        deceasedCount: 0,
      },
    }
    gedcomData = defaultData
    loadedFileName = 'new_family_tree.ged'
    loadedFilePath = undefined
    rawText = ''
    isDirty = false
    activeTab = 'overview'
    selectedIndividualId = ''
    errorMessage = ''
    saveToastMessage = ''
  }

  function closeCurrentFile(): void {
    if (isDirty) {
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm($_('main_page.confirm_unsaved_discard'))
      if (!confirmed) return
    }
    gedcomData = undefined
    loadedFileName = ''
    loadedFilePath = undefined
    rawText = ''
    isDirty = false
    activeTab = 'overview'
    selectedIndividualId = ''
    errorMessage = ''
    saveToastMessage = ''
  }

  async function openNativeFileDialog(): Promise<void> {
    isLoading = true
    errorMessage = ''
    try {
      const result = await window.api.openFileDialog()
      if (!result.canceled && result.data !== undefined) {
        const name = typeof result.filePath === 'string' && result.filePath.length > 0 ? result.filePath.split(/[/\\]/).pop() : 'family_tree.ged'
        handleServerResponse(result.data, name, result.filePath)
      } else {
        isLoading = false
      }
    } catch (err: unknown) {
      isLoading = false
      errorMessage = err instanceof Error ? err.message : String(err)
    }
  }

  function handleFileInput(e: Event): void {
    const target = e.target as HTMLInputElement
    if (target.files !== null && target.files.length > 0) {
      const file = target.files[0]
      readFile(file)
    }
  }

  function readFile(file: File): void {
    isLoading = true
    errorMessage = ''
    loadedFileName = file.name

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      rawText = text
      try {
        const response = await window.api.sendDataToServer(text)
        handleServerResponse(response, file.name)
      } catch (err: unknown) {
        isLoading = false
        errorMessage = err instanceof Error ? err.message : String(err)
      }
    }
    reader.onerror = () => {
      isLoading = false
      errorMessage = 'Failed to read file from disk'
    }
    reader.readAsText(file)
  }

  // Drag & Drop
  function handleDragOver(e: DragEvent): void {
    e.preventDefault()
    isDragging = true
  }

  function handleDragLeave(): void {
    isDragging = false
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault()
    isDragging = false
    if (e.dataTransfer?.files !== undefined && e.dataTransfer.files.length > 0) {
      readFile(e.dataTransfer.files[0])
    }
  }
</script>

<Styles />

<div class="app-root" role="region" aria-label="Atavismo" on:dragover={handleDragOver} on:dragleave={handleDragLeave} on:drop={handleDrop}>
  <!-- Top App Header -->
  <Header
    bind:activeTab
    onOpenFile={openNativeFileDialog}
    onLoadSample={loadSampleTree}
    onNewProject={createNewProject}
    onCloseFile={closeCurrentFile}
    hasData={gedcomData !== undefined}
    fileName={loadedFileName}
    isDirty={isDirty}
    onSaveFile={saveCurrentFile}
    onSaveAsFile={saveAsFile}
  />

  <main class="main-content">
    {#if isLoading}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <p>{$_('main_page.loading')}</p>
      </div>
    {/if}

    {#if typeof errorMessage === 'string' && errorMessage.length > 0}
      <div class="error-banner">
        ⚠️ {errorMessage}
      </div>
    {/if}

    {#if saveToastMessage.length > 0}
      <div class="save-toast" data-testid="save-toast">
        ✅ {saveToastMessage}
      </div>
    {/if}

    {#if gedcomData === undefined}
      <!-- Empty State / Welcome Dropzone -->
      <div class="welcome-hero" class:dragging={isDragging}>
        <div class="hero-card">
          <div class="hero-icon">🌳</div>
          <h2 class="hero-title">{$_('main_page.title')}</h2>
          <p class="citation-subtitle">{$_('main_page.citation')}</p>
          <p class="hero-subtitle">{$_('main_page.subtitle')}</p>

          <div class="drop-zone">
            <div class="drop-icon">📁</div>
            <div class="drop-title">{$_('main_page.drag_drop_title')}</div>
            <div class="drop-subtitle">{$_('main_page.drag_drop_subtitle')}</div>

            <div class="hero-actions">
              <button class="new-project-btn" on:click={createNewProject} data-testid="hero-new-project-btn">
                ➕ {$_('main_page.new_project')}
                <small class="sample-tag">{$_('main_page.new_project_desc')}</small>
              </button>

              <label class="file-upload-btn" data-testid="choose-file-btn">
                <span>📂 {$_('main_page.choose_file')}</span>
                <input type="file" accept=".ged,.gedcom,.txt" on:change={handleFileInput} style="display: none" />
              </label>

              <button class="sample-btn" on:click={loadSampleTree} data-testid="hero-load-sample-btn">
                ✨ {$_('main_page.load_sample')}
                <small class="sample-tag">{$_('main_page.sample_desc')}</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- Loaded Dataset Dashboard -->
      <div class="dashboard-content" class:tree-active={activeTab === 'tree'}>
        <!-- Top Metrics Cards -->
        {#if activeTab === 'overview'}
          <MetricsCard stats={gedcomData.stats} metadata={gedcomData.metadata} />
        {/if}

        <!-- Tab Views -->
        {#if activeTab === 'overview'}
          <div class="tab-pane overview-pane">
            <div class="overview-grid">
              <div class="pane-card">
                <h3 class="pane-title">🌲 Tree Overview</h3>
                <p class="pane-description">
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  {@html $_({
                    id: 'tree_overview.summary',
                    values: { individuals_amount: gedcomData.individuals.length, families_amount: gedcomData.families.length, generations_amount: gedcomData.stats.generationCount },
                  })}
                </p>
                <div class="quick-nav-actions">
                  <button
                    class="nav-pill-btn"
                    on:click={() => {
                      activeTab = 'tree'
                    }}
                  >
                    {$_('tree_overview.explore_family_tree')} →
                  </button>
                  <button
                    class="nav-pill-btn"
                    on:click={() => {
                      activeTab = 'records'
                    }}
                  >
                    {$_({ id: 'tree_overview.browse_all_records', values: { records_amount: gedcomData.individuals.length } })} →
                  </button>
                </div>
              </div>

              <div class="pane-card">
                <div class="pane-header-row">
                  <h3 class="pane-title">📋 Dataset Metadata</h3>
                  <button
                    class="metadata-edit-btn"
                    data-testid="edit-metadata-btn"
                    on:click={openMetadataModal}
                  >
                    ✏️ {$_('records.edit_metadata')}
                  </button>
                </div>
                <ul class="meta-list">
                  <li><span class="meta-key">{$_('dataset_metadata.software_source')}:</span> {gedcomData.metadata.source ?? 'Unknown'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.software_version')}:</span> {gedcomData.metadata.version ?? '—'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.gedcom_standard')}:</span> {gedcomData.metadata.atavismVersion ?? '5.5.1'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.character_encoding')}:</span> {gedcomData.metadata.encoding ?? 'UTF-8'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.submitter')}:</span> {gedcomData.submitter?.name ?? gedcomData.metadata.submitter ?? '—'}</li>
                </ul>
              </div>
            </div>

            <!-- Quick Tree Preview -->
            <TreePreview individuals={gedcomData.individuals} families={gedcomData.families} bind:selectedIndividualId />
          </div>
        {:else if activeTab === 'tree'}
          <div class="tab-pane tree-tab-pane">
            <TreePreview individuals={gedcomData.individuals} families={gedcomData.families} bind:selectedIndividualId />
          </div>
        {:else if activeTab === 'records'}
          <div class="tab-pane">
            <RecordsList
              bind:individuals={gedcomData.individuals}
              bind:families={gedcomData.families}
              bind:sources={gedcomData.sources}
              bind:repositories={gedcomData.repositories}
              bind:media={gedcomData.media}
              bind:selectedIndividualId
              onExploreInTree={() => {
                activeTab = 'tree'
              }}
              onDatasetChanged={handleDatasetChanged}
            />
          </div>
        {:else if activeTab === 'analytics'}
          <div class="tab-pane">
            <AnalyticsView
              individuals={gedcomData.individuals}
              families={gedcomData.families}
              bind:selectedIndividualId
              onSelectPersonInRecords={(id) => {
                selectedIndividualId = id
                activeTab = 'records'
              }}
            />
          </div>
        {:else if activeTab === 'raw'}
          <div class="tab-pane raw-pane">
            <div class="raw-card">
              <h3 class="pane-title">{$_('raw_data.raw_gedcom_dataset')}</h3>
              <pre class="raw-pre"><code>{rawText.length > 0 ? rawText : (gedcomData.metadata.rawPreview ?? $_('raw_data.default_text'))}</code></pre>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Update Prompt -->
    {#if update !== undefined}
      <div class="update-banner">
        {#if !checkingForUpdates}
          <button class="update-btn" on:click={onUpdateApp}>
            {$_('main_page.update')}
            <Icon style="font-size: 14px; margin-left: 6px" name="download" />
          </button>
        {:else}
          <span>{$_('main_page.updating')}</span>
        {/if}
      </div>
    {/if}

    {#if isEditingMetadata}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div
        class="modal-backdrop"
        on:click|self={() => {
          isEditingMetadata = false
        }}
      >
        <div class="edit-modal-card" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3 class="modal-title">{$_('records.edit_metadata')}</h3>
            <button
              class="modal-close-btn"
              on:click={() => {
                isEditingMetadata = false
              }}>&times;</button
            >
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="edit-subm-name">{$_('records.submitter_name')}</label>
              <input
                id="edit-subm-name"
                type="text"
                class="form-input"
                bind:value={editSubmName}
                placeholder="Submitter or researcher name"
                data-testid="edit-submitter-name"
              />
            </div>
            <div class="form-group">
              <label for="edit-subm-address">{$_('records.submitter_address')}</label>
              <input
                id="edit-subm-address"
                type="text"
                class="form-input"
                bind:value={editSubmAddress}
                placeholder="123 Street, City, Country"
                data-testid="edit-submitter-address"
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-subm-email">{$_('records.submitter_email')}</label>
                <input
                  id="edit-subm-email"
                  type="email"
                  class="form-input"
                  bind:value={editSubmEmail}
                  placeholder="name@example.com"
                  data-testid="edit-submitter-email"
                />
              </div>
              <div class="form-group">
                <label for="edit-subm-phone">{$_('records.submitter_phone')}</label>
                <input
                  id="edit-subm-phone"
                  type="text"
                  class="form-input"
                  bind:value={editSubmPhone}
                  placeholder="+1 555-0100"
                  data-testid="edit-submitter-phone"
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="edit-meta-source">{$_('records.software_source')}</label>
                <input
                  id="edit-meta-source"
                  type="text"
                  class="form-input"
                  bind:value={editMetaSource}
                  placeholder="ATAVISMO"
                  data-testid="edit-meta-source"
                />
              </div>
              <div class="form-group">
                <label for="edit-meta-corp">{$_('records.corporation')}</label>
                <input
                  id="edit-meta-corp"
                  type="text"
                  class="form-input"
                  bind:value={editMetaCorp}
                  placeholder="Organization or company"
                  data-testid="edit-meta-corp"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="edit-meta-notes">{$_('records.notes_field')}</label>
              <textarea
                id="edit-meta-notes"
                class="form-textarea"
                rows="3"
                bind:value={editMetaNotes}
                placeholder="Header notes or provenance..."
                data-testid="edit-meta-notes"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="modal-btn secondary"
              on:click={() => {
                isEditingMetadata = false
              }}
            >
              {$_('records.cancel')}
            </button>
            <button
              class="modal-btn primary"
              on:click={saveMetadataModal}
              data-testid="save-metadata-btn"
            >
              {$_('records.save_changes')}
            </button>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <Footer recordCount={gedcomData !== undefined ? gedcomData.individuals.length : 0} />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #0b0f19;
    color: #e2e8f0;
    overflow-x: hidden;
  }

  .app-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    background: radial-gradient(ellipse at 50% 25%, #16213a 0%, #0b0f19 75%);
  }

  .main-content {
    flex: 1;
    padding: 24px;
    padding-bottom: 70px;
    max-width: min(1920px, 96vw);
    width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(11, 15, 25, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 200;
    color: #edf2f7;
    font-size: 16px;
  }

  .spinner {
    width: 44px;
    height: 44px;
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-left-color: #3182ce;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-banner {
    background: rgba(229, 62, 62, 0.2);
    border: 1px solid rgba(229, 62, 62, 0.4);
    color: #feb2b2;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .save-toast {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid #10b981;
    color: #6ee7b7;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }

  .welcome-hero {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 70vh;
  }

  .hero-card {
    background: rgba(26, 32, 44, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 40px 48px;
    text-align: center;
    max-width: 650px;
    width: 100%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  }

  .hero-icon {
    font-size: 56px;
    margin-bottom: 12px;
  }

  .hero-title {
    font-size: 32px;
    font-weight: 800;
    margin: 0;
    color: #ffffff;
    letter-spacing: -0.5px;
  }

  .hero-subtitle {
    font-size: 14px;
    color: #a0aec0;
    margin-top: 8px;
    margin-bottom: 28px;
    line-height: 1.5;
  }

  .citation-subtitle {
    font-size: 12px;
    color: #a0aec0;
    margin-top: 8px;
    margin-bottom: 28px;
    line-height: 1.5;
    font-style: italic;
  }

  .drop-zone {
    border: 2px dashed rgba(66, 153, 225, 0.4);
    background: rgba(15, 23, 42, 0.6);
    border-radius: 12px;
    padding: 32px 24px;
    transition: all 0.2s ease;
  }

  .welcome-hero.dragging .drop-zone {
    border-color: #3182ce;
    background: rgba(49, 130, 206, 0.15);
  }

  .drop-icon {
    font-size: 36px;
    margin-bottom: 8px;
  }

  .drop-title {
    font-size: 16px;
    font-weight: 600;
    color: #edf2f7;
  }

  .drop-subtitle {
    font-size: 12px;
    color: #718096;
    margin-top: 4px;
    margin-bottom: 24px;
  }

  .hero-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .new-project-btn {
    background: #0284c7;
    border: 1px solid #38bdf8;
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
  }

  .new-project-btn:hover {
    background: #0369a1;
    box-shadow: 0 6px 16px rgba(2, 132, 199, 0.5);
    transform: translateY(-1px);
  }

  .file-upload-btn {
    background: #3182ce;
    color: #ffffff;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
    display: inline-block;
    align-content: center;
  }

  .file-upload-btn:hover {
    background: #2b6cb0;
  }

  .sample-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #edf2f7;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sample-btn:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .sample-tag {
    font-size: 11px;
    color: #a0aec0;
    font-weight: normal;
    margin-top: 2px;
  }

  .dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .dashboard-content.tree-active {
    gap: 0;
  }

  .tab-pane.tree-tab-pane {
    height: calc(100vh - 165px);
    min-height: 640px;
    display: flex;
    flex-direction: column;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .pane-card {
    background: rgba(26, 32, 44, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
  }

  .pane-title {
    font-size: 16px;
    font-weight: 700;
    color: #edf2f7;
    margin-top: 0;
    margin-bottom: 12px;
  }

  .pane-description {
    font-size: 14px;
    color: #cbd5e0;
    line-height: 1.6;
  }

  .quick-nav-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .nav-pill-btn {
    background: rgba(49, 130, 206, 0.2);
    border: 1px solid rgba(49, 130, 206, 0.35);
    color: #63b3ed;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .nav-pill-btn:hover {
    background: rgba(49, 130, 206, 0.35);
  }

  .meta-list {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 13px;
  }

  .meta-list li {
    padding: 4px 0;
    color: #cbd5e0;
  }

  .meta-key {
    font-weight: 600;
    color: #a0aec0;
  }

  .raw-card {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 20px;
  }

  .raw-pre {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    padding: 16px;
    max-height: 600px;
    overflow-y: auto;
    font-family: 'Fira Code', monospace, monospace;
    font-size: 12px;
    color: #90cdf4;
  }

  .update-banner {
    position: fixed;
    bottom: 48px;
    right: 24px;
    z-index: 150;
  }

  .update-btn {
    background: #38a169;
    border: none;
    color: #ffffff;
    font-weight: 600;
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
  }

  .update-btn:hover {
    background: #2f855a;
  }

  .pane-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .pane-header-row .pane-title {
    margin-bottom: 0;
  }

  .metadata-edit-btn {
    background: rgba(49, 130, 206, 0.2);
    border: 1px solid rgba(49, 130, 206, 0.4);
    color: #63b3ed;
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .metadata-edit-btn:hover {
    background: rgba(49, 130, 206, 0.4);
    color: #ffffff;
  }

  /* Shared Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(11, 15, 25, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    padding: 20px;
  }

  .edit-modal-card {
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    width: 100%;
    max-width: 560px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .modal-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #f3f4f6;
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    color: #9ca3af;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 0.15s ease;
  }

  .modal-close-btn:hover {
    color: #f3f4f6;
  }

  .modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
  }

  .form-input,
  .form-textarea {
    background: #1f2937;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #f3f4f6;
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s ease;
  }

  .form-input:focus,
  .form-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
  }

  .form-textarea {
    resize: vertical;
    font-family: inherit;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .modal-btn {
    border: none;
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .modal-btn.secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e0;
  }

  .modal-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .modal-btn.primary {
    background: #3b82f6;
    color: #ffffff;
  }

  .modal-btn.primary:hover {
    background: #2563eb;
  }
</style>
