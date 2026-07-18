// Repro 8: two host props (city + activeKey), Task reads city, ok handler
// writes activeKey. Does writing activeKey break city's propagation to the Task?

import { createState, createSlot, createTask, createEffect, match } from '@zeix/cause-effect'

const started = []

const cityState = createState('London')
const citySlot = createSlot(cityState)
const activeKeyState = createState('')
const activeKeySlot = createSlot(activeKeyState)

const weather = createTask(async (_prev, signal) => {
  const c = citySlot.get()
  started.push(c)
  await new Promise(r => setTimeout(r, 10))
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c }
})

// match handler writes activeKey (like the app's ok does)
createEffect(() => match(weather, {
  nil: () => {},
  ok: (_d) => { activeKeySlot.set('') },     // ← write to the OTHER slot in ok
  err: () => {},
  stale: () => {},
}))

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
await sleep(30)

console.log('After init:', JSON.stringify(started))

citySlot.set('Paris')
await sleep(50)
console.log('After Paris:', JSON.stringify(started))

citySlot.set('Tokyo')
await sleep(50)
console.log('After Tokyo:', JSON.stringify(started))
console.log('Expected: ["London","Paris","Tokyo"]')
process.exit(0)
