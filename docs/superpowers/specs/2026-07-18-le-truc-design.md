# Design: Add `@zeix/le-truc` to framework-benchmarks

**Date:** 2026-07-18
**Status:** Approved
**Framework:** [@zeix/le-truc](https://github.com/zeixcom/le-truc) v2.2.x — type-safe reactive Web Components layer over server-rendered HTML

## Context

`framework-benchmarks` is a weather-app benchmark: every framework implements the same weather app behind a shared `data-testid` DOM contract, and `frameworks.json` is the single source of truth that drives the root `package.json` scripts, the website cards, and the CI matrix (all auto-generated). There are currently 13 framework apps under `apps/`.

Le Truc is an HTML-first, progressive-enhancement Web Components library. Components **enhance existing DOM** rather than render it from scratch. It is ESM-only, ships first-class TypeScript types, and works with Vite without a plugin. Its programming model is signals-based with a functional `defineComponent(name, factory)` API where the factory receives helpers (`expose`, `first`, `all`, `on`, `watch`, `each`) and returns an array of effect descriptors.

## Goals

- Add a new `le-truc` framework app that passes the shared Playwright suites (`tests/weather-app.test.js`, `tests/e2e/weather-app-advanced.test.js`) in mock mode.
- Use Le Truc idiomatically (HTML-first enhancement, single custom element, `createList` reconcile for the forecast).
- Register the framework so all derived artifacts (scripts, website, CI matrix, README) generate correctly.
- Match the repo's existing conventions (port 3000, `?mock=true`, `localStorage['weather-app-location']`, shared `/styles/*` and `/mocks/weather-data.json`).

## Non-goals

- Per-region component decomposition (Approach B/C). Deferred — single `<weather-app>` component for now; can refactor later if it pays off.
- Performance tuning beyond idiomatic Le Truc.
- Hand-editing auto-generated files (root `package.json` scripts, `apps/le-truc/README.md`, `website/`).
- TypeScript for any app other than this one (Angular is TS but CLI-mandated).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Build setup | **Vite + npm** | Le Truc v2 is ESM and Vite-friendly (no plugin needed); matches the majority of existing apps (vue/solid/lit/preact/qwik/react/svelte). |
| Language | **TypeScript** | Le Truc is authored in strict TS with first-class types; this is the first non-Angular TS app in the repo, so it adds a `tsconfig.json` + vite TS handling unique to this app. |
| Component strategy | **Approach A — single `<weather-app>` root component** | Most idiomatic for Le Truc's HTML-first pitch; app is small enough that one factory reads cleanly; gives cleanest benchmark signal. Refactor to B/C deferred. |
| Forecast rendering | **`createList` + `<template>` reconcile** | Canonical Le Truc pattern from its data-flow docs; reuses DOM nodes on reorder. |
| `assetsDir` | `public` | Default; matches vue/solid/lit/preact. |
| `buildDir` | `dist` (default) | Standard Vite output. |

## Architecture

A single Vite + TypeScript app at `apps/le-truc/`, registered as framework id **`le-truc`**. The full weather-app markup is authored as static HTML in `index.html` (every required `data-testid` node pre-rendered), and a single `<weather-app>` custom element defined via `defineComponent` queries those nodes and wires reactive behavior. Forecast rows are managed via `createList` keyed by index, reconciled against a `<template>` in a `watch`.

```
apps/le-truc/
├── package.json              # name: weather-app-le-truc, type: module
├── tsconfig.json             # strict ESM TS
├── vite.config.js            # base: './', port 3000, DEV_MODE define
├── index.html                # static markup + <weather-app> + <template>
├── src/
│   ├── main.ts               # imports weather-app.ts (component self-registers)
│   ├── weather-app.ts        # defineComponent('weather-app', factory)
│   ├── weather-service.ts    # ported from apps/vue (typed)
│   └── weather-utils.ts      # ported from apps/vue (typed)
└── public/                   # populated by `npm run sync-assets`
```

## File plan

### `apps/le-truc/` (new)

| File | Purpose |
|---|---|
| `package.json` | `name: weather-app-le-truc`, `type: module`, deps `@zeix/le-truc`, devDeps `vite`, `typescript`, `@playwright/test`. Scripts: `dev`/`build`/`preview`/`test` (local fallbacks; canonical scripts auto-generated at repo root). |
| `tsconfig.json` | Strict ESM: `target: ESNext`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `lib: ["ESNext","DOM","DOM.Iterable"]`, `types: []`. |
| `vite.config.js` | `base: './'`, `server.port: 3000`, `define: { 'process.env.DEV_MODE': '"true"' }` (enables Le Truc dev warnings). No plugin needed — Vite handles `.ts` natively via esbuild. |
| `index.html` | Full static markup with all required `data-testid` nodes pre-rendered; loads the 4 shared `/styles/*` sheets; mounts via `<weather-app>…</weather-app>`; inline `<template id="forecast-item-template">`; loads `/src/main.ts`. |
| `src/main.ts` | Imports `./weather-app.ts` (component auto-registers on import). |
| `src/weather-app.ts` | The single `defineComponent('weather-app', …)` factory. |
| `src/weather-service.ts` | Port of `apps/vue/src/services/weatherService.js` to TS. |
| `src/weather-utils.ts` | Port of `apps/vue/src/utils/weatherUtils.js` to TS. |
| `public/` | Empty placeholder; populated by `npm run sync-assets`. |
| `README.md` | **Auto-generated** by `scripts/transform/build_app_readme.py` — do not hand-write. |

### Repo-wide changes (small, mechanical)

| File | Change |
|---|---|
| `frameworks.json` | Add one entry to the `frameworks` array (full object below). |
| `tests/config/playwright-le-truc.config.js` | **New file**, one line: `module.exports = createConfig('le-truc');` |
| `tests/config/playwright.config.base.js` | Add `le-truc: { baseURL, webServer: { command: 'npm run dev:le-truc', url } }` to the `configs` map. |
| Root `package.json` | **Do not hand-edit** — run `npm run generate-scripts` to add `dev:le-truc`/`build:le-truc`/`test:le-truc`/`lint:le-truc` and update `:all` aggregators. |
| `.gitignore` | No change — existing rules already cover per-app `node_modules`/`dist`. |

## The `frameworks.json` entry

```json
{
  "id": "le-truc",
  "name": "Le Truc",
  "displayName": "Le Truc",
  "dir": "le-truc",
  "assetsDir": "public",
  "build": {
    "buildCommand": "vite build",
    "hasNodeModules": true,
    "devCommand": "vite",
    "testCommand": "playwright test --config=tests/config/playwright-le-truc.config.js",
    "lintFiles": ["ts", "html"]
  },
  "meta": {
    "emoji": "🧩",
    "iconName": "zeix",
    "website": "https://zeixcom.github.io/le-truc/",
    "docs": "https://zeixcom.github.io/le-truc/",
    "github": "https://github.com/zeixcom/le-truc",
    "npmPackage": "@zeix/le-truc",
    "color": "#1E1E1E",
    "accentColor": "#E63946",
    "logo": "",
    "description": "Type-safe reactive Web Components layer over server-rendered HTML",
    "longDescription": "HTML-first progressive enhancement with fine-grained signals, built on standard Web Components."
  }
}
```

> Brand fields (`emoji`, `color`, `accentColor`, `iconName`) are placeholders. `iconName` should be a Simple Icons slug; if Zeix isn't listed there, set `meta.iconUrl` instead. Confirm before merging.

## DOM contract & Le Truc wiring

`index.html` contains the static markup with **all required `data-testid` nodes pre-rendered** (loading, error, weather-content, current-weather fields, empty forecast-list container, search form). Le Truc enhances in place:

- **State:** `expose({ city, isLoading, error, weatherData, activeIndex })`. These become both reactive signals and real properties on the host element.
- **Visibility of states:** loading / error / weather-content blocks all live in the HTML.
  - `watch('isLoading', bindVisible(loadingEl))`
  - `watch('error', e => { errorEl.hidden = !e; if (e) errorTextEl.textContent = e })`
  - `watch('weatherData', d => { contentEl.hidden = !d })`
- **Current weather fields:** on `watch('weatherData', …)` populate `current-location`, `current-temperature`, `current-condition`, `current-icon`, `feels-like`, `humidity`, `wind-speed`, `pressure`, `cloud-cover`, `wind-direction`. These update together (one watch), so direct `textContent` assignment is fine.
- **Forecast list:**
  - `const forecastList = createList([], { keyConfig: 'item' })` — auto-keys `item0`, `item1`, …
  - On `weatherData` change, clear and rebuild: for each of the 7 daily entries, `forecastList.add(datum)`.
  - `watch(() => Array.from(forecastList.keys()), keys => { reconcile against <template> })` — clones `#forecast-item-template`, sets `data-key`, fills `forecast-high`/`forecast-low`/`forecast-temps`/date/condition, and `insertBefore`-reorders existing nodes (canonical Le Truc reconcile snippet from the data-flow docs).
- **Active-row toggle:**
  - `each(forecastItems, item => watch(() => host.activeIndex === Number(item.dataset.key), bindClass(item, 'active')))`
  - `on(all('.forecast-item'), 'click', (_e, target) => ({ activeIndex: Number(target.dataset.key) }))`
- **Search:**
  - `on(form, 'submit', e => { e.preventDefault(); loadWeather(input.value) })`
  - `watch('isLoading', v => { button.disabled = v })`
  - Input value kept in sync from `host.city` via `watch('city', v => { input.value = v })`.
- **Persistence:**
  - On connect: `try { const saved = localStorage.getItem('weather-app-location'); initialCity = saved || 'London' } catch { initialCity = 'London' }`
  - On successful search: `try { localStorage.setItem('weather-app-location', city) } catch {}`
- **Initial load:** trigger `loadWeather(initialCity)` from inside the factory, after all `first`/`all` queries and effect setup are done. Timing is deterministic: `index.html` contains the static `<weather-app>…</weather-app>` markup, `main.ts` imports `weather-app.ts` (which calls `defineComponent`), and `defineComponent` upgrades any already-parsed `<weather-app>` elements immediately — so the factory runs after the DOM is present and all `first`/`all` queries resolve.

## Error handling

- `WeatherService.getWeatherByCity` rejects → set `error` to `err.message`, `isLoading` to false, `weatherData` to null.
- Error text must match `/Unable to (find location|fetch weather data)/i` (inherited verbatim from the ported service, which throws exactly these strings).
- 200ms artificial delay in test environments preserved so the loading state is observable by tests.
- `localStorage` access wrapped in try/catch (private-mode safe), matching existing apps.
- Mock-mode detection rules inherited from Vue: use mock when `?mock=true` is in URL **or** `navigator.userAgent` contains `Playwright`/`HeadlessChrome`; `?mock=false` forces real API calls.

## Testing

No app-local tests are written — consistent with vue/solid/lit. The framework only needs to satisfy the **shared** Playwright suites:

- `tests/weather-app.test.js` (10 core tests: loading state, current weather renders, 7 forecast items, city search, localStorage persistence, error states for invalid location and network failure, detail elements, responsive at 375×667 and 1280×720, accessibility).
- `tests/e2e/weather-app-advanced.test.js` (52 `data-testid` assertions).

### Verification commands (run in order)

1. `npm run generate-scripts` — regenerate root `package.json` scripts.
2. `npm run sync-assets` — populate `apps/le-truc/public/{styles,mocks}`.
3. `cd apps/le-truc && npm install` (or `npm run setup` at root).
4. `npm run test:le-truc` — Playwright suite against `?mock=true`.
5. `npm run lint:le-truc` — lint TS + HTML.
6. `npm run check` — schema + config validation.

## Out of scope

- No benchmark/performance tuning beyond writing idiomatic Le Truc.
- No refactor to per-region components (deferred).
- No website edits (data-driven from `frameworks.json`).
- No CI workflow edits (matrix comes from `scripts/get_frameworks.py`).
