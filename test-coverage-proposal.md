# Test Coverage & Verification Matrix: Atavismo Genealogy Suite

**Target Codebase**: Atavismo GEDCOM Viewer  
**Related Review**: [`code-review.md`](file:///home/goku/git/repos/gedcom-viewer/code-review.md)  
**Test Harness**: Playwright Test Runner ([`backend/playwright.config.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/playwright.config.ts))  
**Test Suites**:
- Unit & Scaling Suite: [`backend/src/__tests__/unit/parser.spec.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/unit/parser.spec.ts) (26 tests)
- E2E & Deterministic Perf Suite: [`backend/src/__tests__/e2e/atavismo.spec.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/e2e/atavismo.spec.ts) (6 tests)
- Standalone Fullscreen Benchmark Suite: [`backend/src/__tests__/perf/fullscreen-perf.bench.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/perf/fullscreen-perf.bench.ts) (2 benchmarks via `npm run test:perf`)
**Current Status**: **32/32 Tests Passing + 2/2 Perf Benchmarks Passing**

---

## 1. Unit Test Coverage ([`parser.spec.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/unit/parser.spec.ts))

### Core AST & Entity Parsing
- [x] **Empty / Whitespace input**: Graceful handling of empty or blank strings.
- [x] **HEAD & SUBM Metadata**: Full parsing of header and submitter records.
- [x] **SOUR, REPO, OBJE Top-level**: Direct entity mapping and properties.
- [x] **Individual & Family Entities**: Vital events, secondary events, citations, and notes.
- [x] **Marriage, Engagement (`ENGA`) & Divorce**: Family events and boolean divorce flags.
- [x] **Dangling Pointers**: Identification of missing pointer targets in diagnostics.
- [x] **Sample Dataset End-to-End**: Verification of `sample.gedcom` (229 individuals, 100 families, 7 generations, `ENGA` events, and unbroken `CONC`+`CONT` biographical notes).
- [x] **Converging DAG Depth**: Dynamic programming verification on multi-path ancestry.
- [x] **CONT Blank Lines & Scoped Continuation**: Preservation of blank lines and isolation to active fields (`TITL`, `ADDR`, `NOTE`).
- [x] **Canonical Vital Precedence**: Priority of `BIRT` over `CHR` and `DEAT` over `BURI`.
- [x] **Extended Diagnostics**: Cross-entity validation of event citations and repository references.
- [x] **Demographic Cutoff**: 115-year heuristic for deceased categorization.
- [x] **Level 3 Note Continuation with Citations**: Simultaneous event citation and multi-line notes on individuals and families.

### Priority 0–4 Edge Cases & Algorithmic Complexity
- [x] **P0-1 (`CONC` leading/trailing whitespace)**: Inner spaces preserved when concatenating continuation lines.
- [x] **P0-2 (Multiple same-type citations)**: Multiple distinct `SOUR` citations on a single event parsed independently.
- [x] **P0-3 (Subordinate address tags in REPO)**: Subordinate tags (`CITY`, `CTRY`) do not corrupt `repo.address`.
- [x] **P1-1 (Clean tree produces zero warnings)**: Fully consistent dataset emits 0 diagnostic warnings.
- [x] **P1-2 (Family event citations)**: Unindexed citation sources on family events emit `INFO` diagnostics.
- [x] **P1-3 (Unindexed media references)**: Unindexed media pointers on individuals and families emit `INFO` diagnostics.
- [x] **P2-1 (Circular parentage graph)**: Cyclic family relationships terminate cleanly without recursion overflow (`inStack` guard).
- [x] **P2-2 (Single individual / No families)**: Generation depth evaluates accurately to 1 for individual-only trees.
- [x] **P2-3 (Dataset with no dates)**: Datasets without date records leave `earliestYear` and `latestYear` safely `undefined`.
- [x] **P3-1 (Line ending independence)**: Identical AST generated across LF (`\n`), CRLF (`\r\n`), and CR (`\r`).
- [x] **P3-2 (UTF-8 Byte Order Mark BOM)**: Strips UTF-8 BOM (`\uFEFF`) before parsing records.
- [x] **P3-3 (Malformed level syntax)**: Safely ignores non-numeric or negative level lines without throwing uncaught exceptions.
- [x] **P4-1 (5,000-Individual Linear $O(N)$ Scaling)**: Parses a synthetic 5,000-individual, 2,500-family GEDCOM dataset in `< 500ms` with linear scaling.

---

## 2. End-to-End & Performance Coverage ([`atavismo.spec.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/e2e/atavismo.spec.ts))

- [x] **Locale Switching**: Verifies `en-US`, `pt-BR`, `es-MX`, and `zh-CN` title and UI translation switching.
- [x] **Sample Dataset Loading**: Loads `sample.gedcom` via IPC and verifies summary metrics.
- [x] **Phase 3 Interactive Tree Modes**: Verifies *Pedigree*, *Descendants*, *Hourglass*, *Fan Chart (180° & 360°)*, and *Family Units*, including viewport height and `<clipPath>` text truncation guards.
- [x] **Fullscreen Performance Guards (CDP)**: Verifies `0` `<video>` elements, `0` `<feDropShadow>` filters, `LayoutCount === 0` and `RecalcStyleCount === 0` during 30-frame fullscreen (`1920x1080`) Hourglass pan/zoom, and `< 2,000` live DOM nodes.
- [x] **Phase 4 Entity Inspector, Search & Media Explorer**: Verifies chronological Life Timeline, diacritic-insensitive fuzzy search (`"Sao Paulo"` matching `"São Paulo"`), media filter toggles, and `SOUR` / `REPO` / `OBJE` sub-tabs.
- [x] **Phase 5 Kinship Pathfinder & Genealogy Analytics**: Verifies Lowest Common Ancestor (LCA) kinship calculation (*Grandparent* ↔ *Grandchild* swap, *Parent* 1st degree / 50% DNA, *Spouse* affine 0% DNA), demographic KPIs, era birth/death histograms, longevity brackets, and migration corridors.
