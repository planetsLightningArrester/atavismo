# Backend

An [Electron](https://www.electronjs.org/) application in TypeScript built with [Electron Forge](https://www.electronforge.io/), containing the zero-dependency GEDCOM 5.5.1/7.0 parser engine (`src/gedcom/`) and IPC bridge.

# Usage

## Running

### `npm run start`

#### What it's for
Runs the packaged production-like Electron app using the compiled frontend in `src/client`.

#### What it does
1. Deletes `dist/`
2. Compiles TypeScript inside `src/` to JS inside `dist/`
3. Copies `src/images/` to `dist/`
4. Copies `src/client/` to `dist/client/`
5. Starts Electron opening `dist/client/index.html`

---

### `npm run start:dev`

#### What it's for
Called by root `../package.json:npm run start` for live development.

#### Requirements
- Frontend running and serving on `http://localhost:5173`. See [frontend](../frontend/README.md).

#### What it does
Runs `nodemon` ([`nodemon.json`](./nodemon.json)), which:
1. Sets `NODE_ENV` to `development`
2. Compiles `src/` into `dist/` and copies `src/images/`
3. Launches Electron pointing to `http://localhost:5173`
4. Watches `src/` for changes and restarts automatically

---

## Testing & Performance Benchmarks

### `npm run test`
Compiles the backend test build (`npm run compile:test`) and executes all unit and E2E tests via Playwright (`src/__tests__/unit/*.spec.ts` and `src/__tests__/e2e/*.spec.ts`).
- On Linux, tests run headlessly inside `xvfb-run`.

### `npm run test:run`
Runs the Playwright unit and E2E suite directly against the already-compiled `dist/` directory without re-running `compile:test` (used by `.husky/pre-push` after `npm run package` to avoid duplicate compilation).

### `npm run test:perf`
Runs the dedicated single-worker fullscreen performance benchmark suite (`src/__tests__/perf/fullscreen-perf.bench.ts`) with `PERF_BENCH=1`, measuring idle CPU/TaskDuration, 5-generation Hourglass pan/zoom frame times (FPS), and CDP layout/style metrics at `1920x1080`.

### `npm run test:dev`
Runs `nodemon` ([`nodemon.test.json`](./nodemon.test.json)) to watch `src/` and re-run Playwright tests automatically in development mode.

---

## Linting & Security

### `npm run lint`
Runs [Electronegativity](https://github.com/doyensec/electronegativity) security checks against `src/` followed by `eslint --ext .js,.ts src`.

---

## Pack and Distribute

### `npm run package` / `npm run make`
Compiles the backend (`npm run compile`), packages or builds distributables with `electron-forge`, and moves the output to `../dist`. To build both frontend and backend from scratch, run `npm run package` or `npm run make` from the repository root.
