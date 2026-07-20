// Repro 1 (systematic): bisect which ok-handler operation causes the loop.
//
// Each variant runs in its own process — invoke the same script with
// different argv. Variants isolate the suspected triggers one at a time:
//   a) empty ok handler
//   b) ok reads a state (does reading inside match-handler track?)
//   c) ok writes to a state (the obvious loop case — sanity check)
//   d) ok mutates a createList (the real weather-app pattern)
//   e) ok mutates a createList, but wrapped in untrack

import { createEffect, createList, createState, createTask, match, untrack } from '@zeix/cause-effect'

const variant = process.argv[2] || 'a'
const log = (m) => console.log(`[${variant}] ${m}`)

const city = createState('London')
const weather = createTask(async (_prev, signal) => {
  city.get()                                     // tracked dep
  await new Promise(r => setTimeout(r, 20))
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { temp: 20 }
})

const counter = createState(0)                   // an unrelated state, for variants b/c
const list = createList([], { keyConfig: 'k' })   // for variant d/e

const handlers = {
  nil: () => {},
  ok: (_data) => {
    switch (variant) {
      case 'a': /* empty */ break
      case 'b': counter.get(); break                        // read inside handler
      case 'c': counter.set(counter.get() + 1); break       // write inside handler
      case 'd':                                            // list mutation, no untrack
        for (const k of Array.from(list.keys())) list.remove(k)
        list.add({ x: 1 })
        break
      case 'e':                                            // list mutation, untracked
        untrack(() => {
          for (const k of Array.from(list.keys())) list.remove(k)
          list.add({ x: 1 })
        })
        break
    }
  }
}

let crashed = false
process.on('uncaughtException', (e) => {
  if (e.name === 'EffectConvergenceError') {
    log(`EffectConvergenceError thrown`)
    crashed = true
  } else {
    log(`other error: ${e.name}: ${e.message}`)
  }
  process.exit(0)
})

createEffect(() => match(weather, handlers))

setTimeout(() => {
  log(crashed ? 'crashed' : 'clean — no convergence error after 300ms')
  process.exit(0)
}, 300)
