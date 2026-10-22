# 👣 Atavism

<p align="center">
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.zh-cn.md"><b>简体中文</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.en-us.md"><b>English</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.es-mx.md"><b>Español</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.md"><b>Português</b></a>
</p>

<h2 align="center">High-performance cross-platform GEDCOM viewer and genealogy explorer built with <a href="https://www.electronjs.org/"><b>Electron.js</b></a> and <a href="https://svelte.dev/"><b>Svelte</b></a></h2>

# Content

- [👣 Atavism](#-atavism)
- [Content](#content)
  - [✨ Features](#-features)
  - [🚀 Usage](#-usage)
  - [💻 Development](#-development)
    - [⚙️ Setup](#️-setup)
    - [🧪 Tests & Performance](#-tests--performance)
  - [📜 License](#-license)

## ✨ Features

- **Zero-Dependency GEDCOM Parser Engine**: Custom, pure TypeScript AST parser supporting GEDCOM 5.5, 5.5.1, and 7.0 specifications (`INDI`, `FAM`, `SOUR`, `REPO`, `OBJE`, `SUBM`, `QUAY` source citations, `CONT`/`CONC` multiline notes, and cross-reference integrity diagnostics) with zero third-party parsing libraries.
- **Interactive Tree Visualizations (D3.js / SVG)**:
  - **Pedigree Tree**, **Descendant Tree**, **Hourglass Chart**, **Fan Chart (180° Fan & 360° Full Wheel)**, and **Family Units**.
  - Filter-free hardware-accelerated pan/zoom, configurable generation depth, quick person jump, and high-resolution **SVG** and **PNG** export.
- **Entity Inspector, Search & Multimedia Explorer**:
  - **Interactive Chronological Life Timeline** with automatic age-at-event badges, causes of death, and inline source citation pills.
  - Dedicated explorers for **Sources (`SOUR`)**, **Archival Repositories (`REPO`)**, and **Multimedia Attachments (`OBJE`)** with bidirectional cross-references.
  - **Diacritic-Insensitive & Typo-Tolerant Fuzzy Search** plus advanced filters for vital status, birth year range, citations, and media.
- **Genealogy Analytics & Kinship Calculator**:
  - **Kinship Pathfinder & Consanguinity Calculator (LCA)**: Compute how any two individuals are related (consanguineal blood or affine marriage paths), Civil & Canon Law degrees, estimated shared DNA percentage, lowest common ancestors, and interactive step-by-step relationship chains.
  - **Demographic & Migration Dashboard**: Average lifespans by sex, longevity records, chronological Births & Deaths by Historical Era histograms, age-at-death brackets, and cross-region **Migration Corridors (Origin → Destination)**.
- **Multilingual Support**: Fully internationalized across English (`en-US`), Portuguese (`pt-BR`), Spanish (`es-MX`), and Simplified Chinese (`zh-CN`).
- **Sample Dataset Included**: Bundled with a rich 10,993-line multi-generational dataset (`sample.gedcom`, 229 individuals, 100 families, 7 generations).

## 🚀 Usage

### Opening Files
- Drag and drop any `.ged`, `.gedcom`, or `.txt` file onto the application window.
- Or click **Open GEDCOM File** in the top navigation bar to choose a file via the native file selector.
- Click **Load Sample Tree** to instantly explore the bundled multi-generational dataset.

## 💻 Development

### ⚙️ Setup

```bash
# Clone the repository
git clone https://github.com/planetsLightningArrester/atavismo.git
cd atavismo

# Install dependencies for root, backend, and frontend
npm ci

# Start development server (with hot-reload)
npm run start
```

### 🧪 Tests & Performance

```bash
# Run security checks (Electronegativity), svelte-check, and ESLint
npm run lint

# Build frontend and backend bundles
npm run build

# Compile test target and run full unit + Playwright E2E suite
npm run test

# Run unit + E2E tests reusing existing backend compilation
npm run test:run

# Run standalone fullscreen performance benchmark suite (CPU / FPS / CDP metrics)
npm run test:perf
```

## 📜 License

This project is licensed under the [GNU GPLv3](LICENSE).
