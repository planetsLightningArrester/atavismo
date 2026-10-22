# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Zero-Dependency GEDCOM 5.5.1 / 7.0 AST Parser**: Full support for `INDI`, `FAM`, `SOUR`, `REPO`, `OBJE`, `SUBM`, event citations (`QUAY`, `PAGE`, `DATA/TEXT`), `CONT`/`CONC` notes, and cross-reference diagnostics.
- **Interactive D3.js / SVG Tree Visualizations**: Added Pedigree, Descendant, Hourglass, 180°/360° Fan Chart, and Family Units views with pan/zoom and SVG/PNG export.
- **Entity Inspector & Multimedia Explorer**: Added chronological Life Timeline with age-at-event badges, inline source citations, Sources/Repositories/Multimedia sub-tabs, and diacritic-insensitive typo-tolerant fuzzy search.
- **Genealogy Analytics & Kinship Calculator**: Added Lowest Common Ancestor (LCA) Kinship Pathfinder, Civil & Canon consanguinity degrees, shared DNA percentage estimation, era birth/death histograms, longevity distribution brackets, and cross-region Migration Corridors.
- **Performance Benchmark & Regression Suite**: Added 5,000-individual $O(N)$ scaling unit test, deterministic CDP fullscreen performance guards, and standalone `npm run test:perf` benchmark suite.

### Changed
- **Fullscreen Rendering Performance**: Replaced background video and per-card SVG `<feDropShadow>` filters with static radial gradients and filter-free SVG offset shadows, cutting fullscreen idle CPU by 96% and pan/zoom CPU by 51%.
- **Git Hooks & Build Scripts**: Decoupled `lint` from `build`, `package`, and `make` scripts and introduced `test:run` so Electronegativity, `svelte-check`, ESLint, and `tsc` each run once on `git push`.
- Update dependencies

## [0.1.0] - [0.1.10] - 2024-03-25

### Added

- Create repo
- Create tests
- Add workflows
