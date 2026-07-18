// Repro 4: does having MULTIPLE subscribers to a Task change whether rapid
// dependency writes trigger recomputation?
//
// In the weather app, the Task has two consumers:
//   1. createEffect(() => match(weather, {ok, nil, ...}))  — visibility
//   2. watch(weather, (data) => forecastList.set(...))      — list derivation
// Symptom: the third rapid city write sometimes doesn't trigger a Task recompute.
//
// This script tests: single subscriber vs two subscribers, rapid writes.

import { createState, createTask, createEffect, match, createList } from '@zeix/cause-effect'

const variant = process.argv[2] || 'single'
const log = (m) => console.log(`[${variant}] ${m}`)

const city = createState('A')
const started = []

const weather = createTask(async (_prev, signal) => {
  const c = city.get()
  started.push(c)
  await new Promise(r => setTimeout(r, 10))
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c }
})

if (variant === 'single') {
  createEffect(() => match(weather, { ok: () => {}, nil: () => {}, err: () => {}, stale: () => {} }))
} else if (variant === 'double') {
  createEffect(() => match(weather, { ok: () => {}, nil: () => {}, err: () => {}, stale: () => {} }))
  // second subscriber — a watch-like effect that reads the task value
  createEffect(() => { try { weather.get() } catch { /* nil */ } })
} else if (variant === 'double-list') {
  createEffect(() => match(weather, { ok: () => {}, nil: () => {}, err: () => {}, stale: () => {} }))
  const list = createList([], { keyConfig: (i) => i.city })
  createEffect(() => { try { list.set([weather.get()]) } catch { /* nil */ } })
}

await new Promise(r => setTimeout(r, 30))   // let 'A' settle

// Three rapid writes
city.set('B'); await Promise.resolve()
city.set('C'); await Promise.resolve()

await new Promise(r => setTimeout(r, 50))

log(`Tasks started: ${JSON.stringify(started)}`)
log(`Expected: ["A","B","C"] (or ["A","C"] if B is aborted by C)`)
process.exit(0)
