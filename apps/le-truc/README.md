<!-- start_framework_specific -->

#### HTML-First Progressive Enhancement
The full weather-app markup lives in [`index.html`](https://github.com/Lissy93/framework-benchmarks/blob/main/apps/le-truc/index.html) as static DOM. A single `<weather-app>` custom element defined in [`weather-app.ts`](https://github.com/Lissy93/framework-benchmarks/blob/main/apps/le-truc/src/weather-app.ts) queries those nodes and wires reactive behavior onto them — no virtual DOM, no client-side rendering of the initial tree.

#### Reactive Pipeline
Weather fetch is modeled as a `createTask` derived from the `host.city` host prop. The Task auto-tracks the city, aborts in-flight requests when it changes, and exposes its state through `match()` routing (`nil` / `stale` / `err` / `ok`). A single `createEffect(() => match(weather, {...}))` descriptor drives loading, error, and content visibility from the Task's state — no imperative `isLoading` / `error` flags.

#### Derived Forecast List
The 7-day forecast is a `createList` with stable date-string keys, derived from the weather Task via a separate `createEffect(match)` that calls `forecastList.set(...)`. The reconciler (`watch(() => forecastList.keys(), ...)`) reacts to list changes and clones the `<template id="forecast-item-template">` per day, reusing DOM nodes for unchanged dates across searches.

#### Signals-Based, No Virtual DOM
Built on [`@zeix/cause-effect`](https://github.com/zeixcom/cause-effect) primitives (State, Task, List, Effect) with fine-grained dependency tracking. Only the specific DOM nodes affected by a state change update — no diffing.

#### TypeScript-Strict
Authored in strict TypeScript. The library's `ComponentProps` type enforces non-nullable host props, so selection state uses sentinel values (`activeKey: ''` for no selection) rather than `null`.

<!-- end_framework_specific -->

<!-- start_license -->

## License

Weather-Front is licensed under [MIT](https://github.com/lissy93/framework-benchmarks/blob/main/LICENSE) © Alicia Sykes 2025.<br>
View [Attributions](https://github.com/lissy93/framework-benchmarks?tab=readme-ov-file#attributions) for credits, thanks and contributors.

<!-- end_license -->