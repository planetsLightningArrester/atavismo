# Frontend

A [Svelte 4](https://svelte.dev/) + [D3.js](https://d3js.org/) application written in TypeScript. Its production bundle under `dist/` is copied to `../backend/src/client` during the build process.

# Architecture

- **`src/App.svelte`**: Root application shell, drag-and-drop file loader, and tab router (*Overview*, *Family Tree*, *Records*, *Analytics & Kinship*, *Raw GEDCOM*).
- **`src/lib/TreePreview.svelte`**: Interactive D3.js / SVG tree visualizations (*Pedigree*, *Descendants*, *Hourglass*, *180°/360° Fan Chart*, and *Family Units*) with pan/zoom and SVG/PNG export.
- **`src/lib/RecordsList.svelte`**: Multi-entity inspector (*Individuals*, *Sources*, *Repositories*, *Multimedia*), chronological Life Timeline with age-at-event and `QUAY` source citations, and diacritic-insensitive typo-tolerant fuzzy search.
- **`src/lib/AnalyticsView.svelte` & `src/lib/kinship.ts`**: Lowest Common Ancestor (LCA) Kinship Pathfinder, Civil & Canon consanguinity calculator, shared DNA estimator, demographic histograms, and cross-region Migration Corridors.
- **`src/i18n/locales/`**: Complete localization dictionaries for `en-US`, `pt-BR`, `es-MX`, and `zh-CN`.

# Usage

## Running

### `npm run dev`
Starts the Vite development server on `http://localhost:5173` with hot module replacement (HMR).

---

## Linting & Type Checking

### `npm run lint`
Runs `svelte-check --tsconfig ./tsconfig.json` followed by `eslint --ext .js,.ts,.svelte src`.

---

## Build

### `npm run build`
1. Bundles the production frontend into `dist/` via `vite build`
2. Runs `scripts/parsePath.js` to rewrite root-relative asset paths for Electron `file://` compatibility
3. Copies `dist/*` to `../backend/src/client/`
