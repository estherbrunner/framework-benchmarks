// Repro 1: createEffect(() => match(task, {...object handlers...})) converges or not?
//
// Setup: a `city` state drives a `weather` Task. A match effect routes the
// four states. Inside the `ok` handler we mutate a `createList` (the thing the
// real weather-app does when rebuilding the 7-day forecast). We do NOT write
// to `city` inside any handler — so on paper the match effect should not loop.
//
// What we observe in the weather-app: EffectConvergenceError on initial load.
// Question: does a minimal version reproduce it?

import { createState, createTask, createEffect, match, createList } from '@zeix/cause-effect'

// Suppress cause-effect's default console.error for unmatched err branches
// so we can see our own output cleanly.

const city = createState('London')

const weather = createTask(async (_prev, signal) => {
  const c = city.get()              // tracked dep
  await new Promise(r => setTimeout(r, 50))   // simulate fetch
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c, temp: 20 }
})

const forecast = createList([], { keyConfig: 'day' })   // simulates the 7-day list

let nilRuns = 0, okRuns = 0, staleRuns = 0, errRuns = 0

// --- Form A: object handlers, NO untrack (what the weather-app did originally) ---
console.log('--- Form A: createEffect(() => match(task, {object handlers})) — no untrack ---')
try {
  createEffect(() => match(weather, {
    nil: () => { nilRuns++ },
    stale: () => { staleRuns++ },
    err: (e) => { errRuns++ },
    ok: (data) => {
      okRuns++
      // Mutate the list inside ok, exactly like the weather-app:
      for (const k of Array.from(forecast.keys())) forecast.remove(k)
      forecast.add({ day: 'mon', high: 20 })
    }
  }))
  console.log('  effect created without throwing')
} catch (e) {
  console.log('  THREW on create:', e.name, '-', e.message)
}

// Wait for the Task to resolve and the match to route
await new Promise(r => setTimeout(r, 300))

console.log(`  after 300ms: nil=${nilRuns} stale=${staleRuns} err=${errRuns} ok=${okRuns}`)
console.log(`  (typical healthy pattern: nil=1, ok=1, others=0)`)
console.log()

// --- Form B: object handlers wrapped in untrack (the workaround that cleared the error) ---
console.log('--- Form B: same, but each handler body wrapped in untrack() ---')
import { untrack } from '@zeix/cause-effect'

const city2 = createState('London')
const weather2 = createTask(async (_prev, signal) => {
  const c = city2.get()
  await new Promise(r => setTimeout(r, 50))
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c, temp: 20 }
})
const forecast2 = createList([], { keyConfig: 'day' })
let nil2 = 0, ok2 = 0, stale2 = 0, err2 = 0

try {
  createEffect(() => match(weather2, {
    nil: () => untrack(() => { nil2++ }),
    stale: () => untrack(() => { stale2++ }),
    err: (e) => untrack(() => { err2++ }),
    ok: (data) => untrack(() => {
      ok2++
      for (const k of Array.from(forecast2.keys())) forecast2.remove(k)
      forecast2.add({ day: 'mon', high: 20 })
    })
  }))
  console.log('  effect created without throwing')
} catch (e) {
  console.log('  THREW on create:', e.name, '-', e.message)
}

await new Promise(r => setTimeout(r, 300))
console.log(`  after 300ms: nil=${nil2} stale=${stale2} err=${err2} ok=${ok2}`)
console.log()

console.log('=== done ===')
