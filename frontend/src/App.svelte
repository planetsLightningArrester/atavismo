<script lang="ts">
  import './i18n'
  import { _ } from 'svelte-i18n'
  import Header from './lib/Header.svelte'
  import MetricsCard from './lib/MetricsCard.svelte'
  import TreePreview from './lib/TreePreview.svelte'
  import RecordsList from './lib/RecordsList.svelte'
  import AnalyticsView from './lib/AnalyticsView.svelte'
  import Footer from './lib/Footer.svelte'
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
  let activeTab: 'overview' | 'tree' | 'records' | 'analytics' | 'raw' = 'overview'
  let selectedIndividualId = ''
  let isLoading = false
  let errorMessage = ''
  let isDragging = false

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

  function handleServerResponse(response: DataServerResponse, filename?: string): void {
    isLoading = false
    if (response.error !== undefined) {
      errorMessage = response.error.message
      console.error('GEDCOM Parse Error:', response.error)
    } else if (response.result !== undefined) {
      errorMessage = ''
      gedcomData = response.result
      if (typeof filename === 'string' && filename.length > 0) loadedFileName = filename
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
    } catch (err: unknown) {
      isLoading = false
      errorMessage = err instanceof Error ? err.message : String(err)
    }
  }

  async function openNativeFileDialog(): Promise<void> {
    isLoading = true
    errorMessage = ''
    try {
      const result = await window.api.openFileDialog()
      if (!result.canceled && result.data !== undefined) {
        const name = typeof result.filePath === 'string' && result.filePath.length > 0 ? result.filePath.split(/[/\\]/).pop() : 'family_tree.ged'
        handleServerResponse(result.data, name)
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
  <Header bind:activeTab onOpenFile={openNativeFileDialog} onLoadSample={loadSampleTree} hasData={gedcomData !== undefined} fileName={loadedFileName} />

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
              <label class="file-upload-btn" data-testid="choose-file-btn">
                <span>{$_('main_page.choose_file')}</span>
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
                <h3 class="pane-title">📋 Dataset Metadata</h3>
                <ul class="meta-list">
                  <li><span class="meta-key">{$_('dataset_metadata.software_source')}:</span> {gedcomData.metadata.source ?? 'Unknown'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.software_version')}:</span> {gedcomData.metadata.version ?? '—'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.gedcom_standard')}:</span> {gedcomData.metadata.atavismVersion ?? '5.5.1'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.character_encoding')}:</span> {gedcomData.metadata.encoding ?? 'UTF-8'}</li>
                  <li><span class="meta-key">{$_('dataset_metadata.submitter')}:</span> {gedcomData.metadata.submitter ?? '—'}</li>
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
              individuals={gedcomData.individuals}
              families={gedcomData.families}
              sources={gedcomData.sources}
              repositories={gedcomData.repositories}
              media={gedcomData.media}
              bind:selectedIndividualId
              onExploreInTree={() => {
                activeTab = 'tree'
              }}
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
              <pre class="raw-pre"><code>{rawText.length > 0 ? rawText : $_('raw_data.default_text')}</code></pre>
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
    max-width: 1400px;
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
</style>
