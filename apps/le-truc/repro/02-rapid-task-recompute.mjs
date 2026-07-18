// Repro 2: does rapid successive writes to a Task's dependency reliably
// trigger recomputation each time?
//
// In the weather-app, three rapid `host.city = ...` writes (London→Paris→Tokyo)
// sometimes result in only the first two Tasks running — Tokyo never starts.
// This script strips away the DOM, the Le Truc component layer, and the
// untrack question entirely: just a State, a Task, and rapid .set() calls.
//
// We vary two things:
//   - whether writes are synchronous (within one tick) or delayed (setTimeout 0)
//   - whether a match effect with list-mutating ok-handler is attached
//     (to check if the Repro-1 loop interacts with Task re-subscription)

import { createState, createTask, createEffect, match, createList, untrack } from '@zeix/cause-effect'

const variant = process.argv[2] || 'plain'
const log = (m) => console.log(`[${variant}] ${m}`)

const city = createState('London')
const started = []

const weather = createTask(async (_prev, signal) => {
  const c = city.get()
  started.includes(c) || started.push(c)         // record START, not just ok
  await new Promise(r => setTimeout(r, 10))
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c }
})

// attach an observer so the Task actually runs
if (variant === 'plain' || variant === 'with-list') {
  const list = createList([], { keyConfig: 'k' })
  createEffect(() => match(weather, {
    ok: (data) => {
      started.includes(data.city) || started.push(data.city)
      if (variant === 'with-list') {
        untrack(() => {                       // guard the list write (per Repro 1 finding)
          for (const k of Array.from(list.keys())) list.remove(k)
          list.add({ city: data.city })
        })
      }
    },
    nil: () => {},
    err: () => {},
    stale: () => {},
  }))
} else if (variant === 'effect-only') {
  // no list at all, no untrack — minimal observer
  createEffect(() => match(weather, { ok: (d) => started.includes(d.city) || started.push(d.city), nil: () => {}, err: () => {}, stale: () => {} }))
}

// Give the initial London task time to resolve
await new Promise(r => setTimeout(r, 30))

// Three rapid successive writes, with a microtask between each (closest
// analogue to three separate Playwright clicks — separated by real async work
// but no artificial delay).
for (const c of ['Paris', 'Tokyo']) {
  city.set(c)
  await Promise.resolve()   // let the write flush
}

// Wait long past the 10ms fetch delay for any straggler tasks
await new Promise(r => setTimeout(r, 100))

log(`Tasks that started: ${JSON.stringify(started)}`)
log(`Expected: ["London","Paris","Tokyo"]`)
process.exit(0)
