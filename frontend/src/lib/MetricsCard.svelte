<script lang="ts">
  import { _ } from 'svelte-i18n'

  export let stats: GedcomStats
  export let metadata: Metadata
</script>

<div class="metrics-grid">
  <div class="metric-card">
    <div class="metric-icon individuals-icon">👥</div>
    <div class="metric-content">
      <div class="metric-value">{stats.totalIndividuals.toLocaleString()}</div>
      <div class="metric-label">{$_('main_page.individuals')}</div>
      <div class="metric-sub">
        <span class="badge male">♂ {stats.maleCount}</span>
        <span class="badge female">♀ {stats.femaleCount}</span>
        {#if stats.unknownSexCount > 0}
          <span class="badge unknown">? {stats.unknownSexCount}</span>
        {/if}
      </div>
    </div>
  </div>

  <div class="metric-card">
    <div class="metric-icon families-icon">💍</div>
    <div class="metric-content">
      <div class="metric-value">{stats.totalFamilies.toLocaleString()}</div>
      <div class="metric-label">{$_('main_page.families')}</div>
      <div class="metric-sub text-muted">
        {typeof metadata.source === 'string' && metadata.source.length > 0 ? `${$_('main_page.source')}: ${metadata.source}` : ''}
      </div>
    </div>
  </div>

  <div class="metric-card">
    <div class="metric-icon generations-icon">🌳</div>
    <div class="metric-content">
      <div class="metric-value">{stats.generationCount}</div>
      <div class="metric-label">{$_('main_page.generations')}</div>
      <div class="metric-sub text-muted">
        {typeof metadata.atavismVersion === 'string' && metadata.atavismVersion.length > 0 ? `GEDCOM ${metadata.atavismVersion}` : ''}
      </div>
    </div>
  </div>

  <div class="metric-card">
    <div class="metric-icon range-icon">⏳</div>
    <div class="metric-content">
      <div class="metric-value">
        {stats.earliestYear ?? '—'} – {stats.latestYear ?? '—'}
      </div>
      <div class="metric-label">{$_('main_page.lifespan_range')}</div>
      <div class="metric-sub text-muted">
        {typeof metadata.encoding === 'string' && metadata.encoding.length > 0 ? `${$_('main_page.encoding')}: ${metadata.encoding}` : ''}
      </div>
    </div>
  </div>
</div>

{#if stats.topSurnames.length > 0}
  <div class="surnames-bar">
    <span class="surnames-title">{$_('main_page.top_surnames')}:</span>
    <div class="surnames-list">
      {#each stats.topSurnames as item}
        <span class="surname-chip">
          <b>{item.surname}</b> <small>({item.count})</small>
        </span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .metric-card {
    background: rgba(26, 32, 44, 0.75);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    border-color: rgba(66, 153, 225, 0.4);
  }

  .metric-icon {
    font-size: 28px;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
  }

  .metric-content {
    flex: 1;
    min-width: 0;
  }

  .metric-value {
    font-size: 22px;
    font-weight: 700;
    color: #edf2f7;
    line-height: 1.2;
  }

  .metric-label {
    font-size: 13px;
    color: #a0aec0;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-sub {
    font-size: 12px;
    margin-top: 6px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .badge {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }

  .badge.male {
    background: rgba(49, 130, 206, 0.25);
    color: #63b3ed;
    border: 1px solid rgba(49, 130, 206, 0.3);
  }

  .badge.female {
    background: rgba(213, 63, 140, 0.25);
    color: #f687b3;
    border: 1px solid rgba(213, 63, 140, 0.3);
  }

  .badge.unknown {
    background: rgba(160, 174, 192, 0.2);
    color: #cbd5e0;
  }

  .surnames-bar {
    background: rgba(26, 32, 44, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .surnames-title {
    font-size: 13px;
    font-weight: 600;
    color: #a0aec0;
  }

  .surnames-list {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .surname-chip {
    background: rgba(43, 108, 176, 0.2);
    border: 1px solid rgba(66, 153, 225, 0.25);
    color: #90cdf4;
    padding: 2px 10px;
    border-radius: 16px;
    font-size: 12px;
  }

  .surname-chip small {
    opacity: 0.8;
  }
</style>
