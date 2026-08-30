<script lang="ts">
  import { _ } from 'svelte-i18n'
  import githubSvg from '../assets/github.svg'
  import { Tooltip } from '@sveltestrap/sveltestrap'

  export let recordCount: number = 0
</script>

<!-- Bottom bar -->
<div class="footer fixed-bottom justify-content-center">
  <footer class="d-flex flex-wrap justify-content-between align-items-center py-2 px-4 border-top w-100 m-auto">
    <div class="footer-left">
      <span class="footer-text">
        Atavismo &bull; {$_('footer.powered_by')}
      </span>
      {#if recordCount > 0}
        <span class="footer-badge">
          {recordCount.toLocaleString()}
          {$_('footer.loaded_records')}
        </span>
      {/if}
    </div>

    <div class="footer-right d-flex align-items-center">
      <Tooltip target="github-icon-anchor">{$_('footer.github_page')}</Tooltip>
      <a id="github-icon-anchor" style="display: flex; user-select: none" href="https://github.com/planetsLightningArrester/atavismo" target="_blank" rel="noreferrer">
        <img id="github-icon-image" class="github-cat" src={githubSvg} alt={$_('footer.github_page')} height="18px" />
      </a>
    </div>
  </footer>
</div>

<style>
  .footer {
    background-color: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 50;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .footer-text {
    color: #a0aec0;
    font-size: 12px;
    user-select: none;
  }

  .footer-badge {
    background: rgba(49, 130, 206, 0.2);
    border: 1px solid rgba(49, 130, 206, 0.3);
    color: #63b3ed;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .github-cat {
    filter: invert(0);
    transition: 300ms;
  }

  .github-cat:hover {
    filter: invert(48%);
    transition: 300ms;
  }
</style>
