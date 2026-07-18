// Repro 7: simulate Le Truc's host prop machinery in pure cause-effect.
// Le Truc wraps each exposed prop in a Slot (for replaceability) backed by a
// createState. The Task reads host.city, which goes through slot.get() →
// delegated state.get(). Writes go through slot.set() → delegated state.set().
//
// Question: does a Task that reads through a Slot recompute when the Slot's
// underlying state is set?

import { createState, createSlot, createTask, createEffect, match } from '@zeix/cause-effect'

const started = []

// Mirror Le Truc's #setAccessor: createSlot wrapping a createState
const underlying = createState('London')
const citySlot = createSlot(underlying)

const weather = createTask(async (_prev, signal) => {
  const c = citySlot.get()        // read through the slot (Task becomes sink of slot's memo)
  started.push(c)
  await new Promise(r => setTimeout(r, 10))
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c }
})

createEffect(() => match(weather, { ok: () => {}, nil: () => {}, err: () => {}, stale: () => {} }))

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
await sleep(30)

console.log('After init:', JSON.stringify(started))

// Write via slot.set() — mirrors host.city = 'Paris'
citySlot.set('Paris')
await sleep(50)
console.log('After Paris:', JSON.stringify(started))

citySlot.set('Tokyo')
await sleep(50)
console.log('After Tokyo:', JSON.stringify(started))
console.log('Expected: ["London","Paris","Tokyo"]')
process.exit(0)
