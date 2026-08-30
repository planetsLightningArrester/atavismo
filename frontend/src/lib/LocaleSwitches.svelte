<script lang="ts">
  import { locale, isLoading } from 'svelte-i18n'
  import zhFlag from '../assets/zh-flag.svg'
  import usFlag from '../assets/us-flag.svg'
  import mxFlag from '../assets/mx-flag.png'
  import brFlag from '../assets/br-flag.png'
  import { resolveImgPath } from './common'

  let zhLoaded = false
  let enLoaded = false
  let esLoaded = false
  let ptLoaded = false
</script>

<div class="locales-container">
  <button
    class="flag-btn"
    title="简体中文"
    on:click={async () => {
      await locale.set('zh-CN')
    }}
  >
    <img
      src={zhFlag}
      alt="简体中文"
      hidden={!$isLoading && !zhLoaded}
      data-testid="zh-CN-button"
      class={$locale === 'zh-CN' ? 'flag-selected' : 'flag-not-selected'}
      on:load={() => {
        zhLoaded = true
      }}
    />
  </button>
  <button
    class="flag-btn"
    title="English"
    on:click={async () => {
      await locale.set('en-US')
    }}
  >
    <img
      src={usFlag}
      alt="English"
      hidden={!$isLoading && !enLoaded}
      data-testid="en-US-button"
      class={$locale === 'en-US' ? 'flag-selected' : 'flag-not-selected'}
      on:load={() => {
        enLoaded = true
      }}
    />
  </button>
  <button
    class="flag-btn"
    title="Español"
    on:click={async () => {
      await locale.set('es-MX')
    }}
  >
    <img
      src={resolveImgPath(mxFlag)}
      alt="Español"
      hidden={!$isLoading && !esLoaded}
      data-testid="es-MX-button"
      class={$locale === 'es-MX' ? 'flag-selected' : 'flag-not-selected'}
      on:load={() => {
        esLoaded = true
      }}
    />
  </button>
  <button
    class="flag-btn"
    title="Português"
    on:click={async () => {
      await locale.set('pt-BR')
    }}
  >
    <img
      src={resolveImgPath(brFlag)}
      alt="Português"
      hidden={!$isLoading && !ptLoaded}
      data-testid="pt-BR-button"
      class={$locale === 'pt-BR' ? 'flag-selected' : 'flag-not-selected'}
      on:load={() => {
        ptLoaded = true
      }}
    />
  </button>
</div>

<style lang="scss">
  .locales-container {
    display: flex;
    align-items: center;
    gap: 4px;
    user-select: none;
  }

  .flag-btn {
    border: none;
    background: transparent;
    padding: 2px;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .flag-selected {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid #3182ce;
    box-shadow: 0 0 8px rgba(49, 130, 206, 0.6);
  }

  .flag-not-selected {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    opacity: 0.6;
    transition: opacity 0.2s ease, transform 0.2s ease;
    border: 2px solid transparent;

    &:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  }
</style>
