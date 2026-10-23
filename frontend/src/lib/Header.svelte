<script lang="ts">
  import { _ } from 'svelte-i18n'
  import LocaleSwitches from './LocaleSwitches.svelte'

  export let activeTab: 'overview' | 'tree' | 'records' | 'analytics' | 'raw' = 'overview'
  export let onOpenFile: () => void
  export let onLoadSample: () => void
  export let onNewProject: (() => void) | null = null
  export let onCloseFile: (() => void) | null = null
  export let hasData: boolean = false
  export let fileName: string = ''
  export let isDirty: boolean = false
  export let onSaveFile: (() => void) | null = null
  export let onSaveAsFile: (() => void) | null = null
</script>

<header class="app-header">
  <div class="header-left">
    <div class="brand">
      <span class="brand-icon">🌳</span>
      <div>
        <h1 class="brand-title" data-testid="main-page-title">{$_('main_page.title')}</h1>
        {#if fileName.length > 0}
          <div class="brand-file" title={fileName}>
            📄 {fileName}
            {#if isDirty}
              <span class="unsaved-badge" data-testid="unsaved-badge" title={$_('main_page.unsaved_changes')}>
                ● {$_('main_page.unsaved_changes')}
              </span>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Navigation View Tabs -->
  {#if hasData}
    <div class="header-center">
      <nav class="view-tabs">
        <button
          class="tab-btn"
          class:active={activeTab === 'overview'}
          data-testid="tab-overview"
          on:click={() => {
            activeTab = 'overview'
          }}
        >
          📊 {$_('main_page.tab_overview')}
        </button>
        <button
          class="tab-btn"
          class:active={activeTab === 'tree'}
          data-testid="tab-tree"
          on:click={() => {
            activeTab = 'tree'
          }}
        >
          🌿 {$_('main_page.tab_tree')}
        </button>
        <button
          class="tab-btn"
          class:active={activeTab === 'records'}
          data-testid="tab-records"
          on:click={() => {
            activeTab = 'records'
          }}
        >
          📋 {$_('main_page.tab_records')}
        </button>
        <button
          class="tab-btn"
          class:active={activeTab === 'analytics'}
          data-testid="tab-analytics"
          on:click={() => {
            activeTab = 'analytics'
          }}
        >
          🧬 {$_('main_page.tab_analytics')}
        </button>
        <button
          class="tab-btn"
          class:active={activeTab === 'raw'}
          data-testid="tab-raw"
          on:click={() => {
            activeTab = 'raw'
          }}
        >
          📝 {$_('main_page.tab_raw')}
        </button>
      </nav>
    </div>
  {/if}

  <div class="header-right">
    <div class="actions">
      {#if hasData && onSaveFile !== null}
        <button
          class="action-btn success"
          class:pulse={isDirty}
          on:click={onSaveFile}
          data-testid="save-file-button"
          title="Ctrl+S / Cmd+S"
        >
          💾 {$_('main_page.save_file')}
        </button>
      {/if}
      {#if hasData && onSaveAsFile !== null}
        <button
          class="action-btn outline"
          on:click={onSaveAsFile}
          data-testid="save-as-button"
        >
          📤 {$_('main_page.save_as')}
        </button>
      {/if}
      {#if onNewProject !== null}
        <button
          class="action-btn new"
          on:click={onNewProject}
          data-testid="new-project-button"
          title={$_('main_page.new_project_desc')}
        >
          ➕ {$_('main_page.new_project')}
        </button>
      {/if}
      <button class="action-btn primary" on:click={onOpenFile} data-testid="open-file-button">
        📂 {$_('main_page.open_file')}
      </button>
      <button class="action-btn secondary" on:click={onLoadSample} data-testid="load-sample-button">
        ✨ {$_('main_page.load_sample')}
      </button>
      {#if hasData && onCloseFile !== null}
        <button
          class="action-btn danger-outline"
          on:click={onCloseFile}
          data-testid="close-file-button"
          title={$_('main_page.close_file')}
        >
          ✕ {$_('main_page.close_file')}
        </button>
      {/if}
    </div>

    <div class="locales-wrapper">
      <LocaleSwitches />
    </div>
  </div>
</header>

<style>
  .app-header {
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 16px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .header-left {
    display: flex;
    align-items: center;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .brand-icon {
    font-size: 28px;
  }

  .brand-title {
    font-size: 20px;
    font-weight: 700;
    color: #edf2f7;
    margin: 0;
    letter-spacing: -0.5px;
  }

  .brand-file {
    font-size: 11px;
    color: #a0aec0;
    max-width: 240px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-center {
    display: flex;
    align-items: center;
  }

  .view-tabs {
    display: flex;
    background: rgba(26, 32, 44, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
  }

  .tab-btn {
    background: transparent;
    border: none;
    color: #a0aec0;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    color: #edf2f7;
  }

  .tab-btn.active {
    background: #2b6cb0;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(43, 108, 176, 0.4);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    border-radius: 6px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn.new {
    background: #0284c7;
    border: 1px solid #38bdf8;
    color: #ffffff;
  }

  .action-btn.new:hover {
    background: #0369a1;
  }

  .action-btn.danger-outline {
    background: transparent;
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #fca5a5;
  }

  .action-btn.danger-outline:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
    color: #ffffff;
  }

  .action-btn.primary {
    background: #3182ce;
    border: 1px solid #4299e1;
    color: #ffffff;
  }

  .action-btn.primary:hover {
    background: #2b6cb0;
  }

  .action-btn.secondary {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #edf2f7;
  }

  .action-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .unsaved-badge {
    color: #fbbf24;
    font-size: 11px;
    font-weight: 600;
    margin-left: 6px;
    animation: pulseGlow 2s infinite ease-in-out;
  }

  .action-btn.success {
    background: #059669;
    border: 1px solid #10b981;
    color: #ffffff;
  }

  .action-btn.success:hover {
    background: #047857;
  }

  .action-btn.success.pulse {
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
  }

  .action-btn.outline {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #e5e7eb;
  }

  .action-btn.outline:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
  }

  @keyframes pulseGlow {
    0%,
    100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
      text-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
    }
  }

  .locales-wrapper {
    display: flex;
    align-items: center;
  }

  @media (max-width: 1150px) {
    .app-header {
      padding: 10px 16px;
    }

    .header-center {
      order: 3;
      width: 100%;
      justify-content: center;
    }

    .view-tabs {
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
    }

    .tab-btn {
      padding: 5px 10px;
      font-size: 12px;
    }

    .action-btn {
      padding: 6px 10px;
      font-size: 12px;
    }
  }
</style>
