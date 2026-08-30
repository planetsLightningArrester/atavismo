# 👣 Atavism

<p align="center">
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.zh-cn.md"><b>简体中文</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.en-us.md"><b>English</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.es-mx.md"><b>Español</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.md"><b>Português</b></a>
</p>

<h2 align="center">High-performance cross-platform GEDCOM viewer and genealogy explorer built with <a href="https://www.electronjs.org/"><b>Electron.js</b></a> and <a href="https://svelte.dev/"><b>Svelte</b></a></h2>

# Content

- [👣  Atavism](#-atavism)
- [Content](#content)
  - [✨ Features](#-features)
  - [🚀 Usage](#-usage)
  - [💻 Development](#-development)
    - [⚙️ Setup](#️-setup)
    - [🧪 Tests](#-tests)
  - [📜 License](#-license)

## ✨ Features

- **Zero-Dependency GEDCOM Parser Engine**: Custom, pure TypeScript parser for GEDCOM 5.5 and 5.5.1 specifications without external parsing libraries.
- **Interactive Family Tree Visualizer**: Explore individuals, spouses, parents, and children with intuitive pedigree and family branch navigation.
- **Instant Search & Filters**: Search across thousands of records by name, surname, or ID with real-time gender and event filtering.
- **Detailed Entity Inspector**: Inspect vital statistics, birth/death lifespans, marriage records, and multiline biographical notes.
- **Multilingual Support**: Fully internationalized with English (`en-US`), Portuguese (`pt-BR`), Spanish (`es-MX`), and Simplified Chinese (`zh-CN`).
- **Sample Dataset Included**: Comes with a bundled real-world 3,850+ line genealogical dataset ready to explore.

## 🚀 Usage

### Opening Files
- Drag and drop any `.ged`, `.gedcom`, or `.txt` file onto the application window.
- Or click **Open GEDCOM File** in the top navigation bar to choose a file via the native file selector.
- Click **Load Sample Tree** to instantly explore the pre-loaded dataset.

## 💻 Development

### ⚙️ Setup

```bash
# Clone the repository
git clone https://github.com/planetsLightningArrester/atavismo.git
cd atavismo

# Install dependencies for root, backend, and frontend
npm run preinstall

# Start development server (with hot-reload)
npm run start
```

### 🧪 Tests & Linting

```bash
# Run linter across backend and frontend
npm run lint

# Build frontend and backend
npm run build

# Run automated Playwright E2E tests
npm run test
```

## 📜 License

This project is licensed under the [GNU GPLv3](LICENSE).
