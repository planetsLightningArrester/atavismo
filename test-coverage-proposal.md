# Test Coverage Proposal: GEDCOM Parser & Genealogy Engine

**Target Codebase**: Atavismo GEDCOM Viewer  
**Related Review**: [`code-review.md`](file:///home/goku/git/repos/gedcom-viewer/code-review.md)  
**Test Harness**: Playwright Test Runner ([`backend/playwright.config.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/playwright.config.ts))  
**Primary Test Suite**: [`backend/src/__tests__/unit/parser.spec.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/unit/parser.spec.ts)  
**Current Status**: **27/27 Tests Passing (25 Unit + 2 E2E)**

---

## 1. Overview & Verification Status

All 27 automated tests are executing and passing in ~3.3 seconds with 0 linter and TypeScript errors. All proposed test cases across Priorities 0 through 3 have been fully incorporated into [`backend/src/__tests__/unit/parser.spec.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/unit/parser.spec.ts).

---

## 2. Test Coverage Matrix

### Completed Tests (Verified in [`parser.spec.ts`](file:///home/goku/git/repos/gedcom-viewer/backend/src/__tests__/unit/parser.spec.ts))

#### Core Functionality & Engine Fixes
- [x] **Empty / Whitespace input**: Graceful handling of empty or blank strings.
- [x] **HEAD & SUBM Metadata**: Full parsing of header and submitter records.
- [x] **SOUR, REPO, OBJE Top-level**: Direct entity mapping and properties.
- [x] **Individual & Family Entities**: Events, citations, and notes.
- [x] **Marriage & Divorce**: Family events and boolean divorce flags.
- [x] **Dangling Pointers**: Identification of missing pointer targets in diagnostics.
- [x] **Sample Dataset End-to-End**: Verification of `sample.gedcom` (229 individuals, 100 families, 7 generations).
- [x] **Converging DAG Depth**: Dynamic programming verification on multi-path ancestry.
- [x] **CONT Blank Lines & Scoped Continuation**: Preservation of blank lines and isolation to active fields (`TITL`, `ADDR`).
- [x] **Canonical Vital Precedence**: Priority of `BIRT` over `CHR` and `DEAT` over `BURI`.
- [x] **Extended Diagnostics**: Cross-entity validation of event citations and repository references.
- [x] **Demographic Cutoff**: 115-year heuristic for deceased categorization.
- [x] **Level 3 Note Continuation with Citations**: Simultaneous event citation and multi-line notes on individuals and families.

#### Priority 0: Core AST Edge Cases (Unit)
- [x] **P0-1 (`CONC` leading whitespace)**: Inner spaces preserved when concatenating continuation lines (`Word continued with space`).
- [x] **P0-2 (Multiple same-type citations)**: Multiple distinct `SOUR` citations on a single event parsed with their respective page numbers.
- [x] **P0-3 (Subordinate address tags in REPO)**: Subordinate tags (`CITY`, `CTRY`) do not corrupt `repo.address`.

#### Priority 1: Diagnostics & Integrity Edge Cases (Unit)
- [x] **P1-1 (Clean tree produces zero warnings)**: Fully consistent dataset emits 0 diagnostic warnings.
- [x] **P1-2 (Family event citations)**: Unindexed citation sources on family events emit `INFO` diagnostics.
- [x] **P1-3 (Unindexed media references)**: Unindexed media pointers on individuals and families emit `INFO` diagnostics.

#### Priority 2: Graph Algorithm Boundary Cases (Unit)
- [x] **P2-1 (Circular parentage graph)**: Cyclic family relationships terminate cleanly without recursion overflow (`inStack` guard).
- [x] **P2-2 (Single individual / No families)**: Generation depth evaluates accurately to 1 for individual-only trees.
- [x] **P2-3 (Dataset with no dates)**: Datasets without date records leave `earliestYear` and `latestYear` safely `undefined`.

#### Priority 3: Encodings & Formatting Resilience (Fuzz / Boundary)
- [x] **P3-1 (Line ending independence)**: Exact identical AST generated across LF (`\n`), CRLF (`\r\n`), and CR (`\r`).
- [x] **P3-2 (UTF-8 Byte Order Mark BOM)**: Strips UTF-8 BOM (`\uFEFF`) before parsing records.
- [x] **P3-3 (Malformed level syntax)**: Safely ignores non-numeric or negative level lines without throwing uncaught exceptions.
