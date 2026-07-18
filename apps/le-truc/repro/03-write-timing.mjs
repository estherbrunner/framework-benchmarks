// Repro 2b: nail down the timing of the skipped intermediate Task.
//
// Variant 'sync':   three city.set() calls in the same tick, no awaits
// Variant 'micro':  await Promise.resolve() between each set
// Variant 'timer0': await setTimeout(0) between each set
// Variant 'timer5': await setTimeout(5) between each set (> fetch delay)
//
// For each, we record every (city, startedAt, settledWith) tuple to see
// whether Paris's Task fn body is entered at all.

import { createState, createTask, createEffect, match } from '@zeix/cause-effect'

const variant = process.argv[2] || 'micro'
const log = (m) => console.log(`[${variant}] ${m}`)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const city = createState('London')
const trace = []   // { phase, city, t }

const weather = createTask(async (_prev, signal) => {
  const c = city.get()
  trace.push({ phase: 'start', city: c })
  await sleep(5)
  trace.push({ phase: 'end', city: c, aborted: signal.aborted })
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c }
})

createEffect(() => match(weather, { ok: () => {}, nil: () => {}, err: () => {}, stale: () => {} }))

await sleep(20)   // let London settle

if (variant === 'sync') {
  city.set('Paris'); city.set('Tokyo')
} else if (variant === 'micro') {
  city.set('Paris'); await Promise.resolve()
  city.set('Tokyo'); await Promise.resolve()
} else if (variant === 'timer0') {
  city.set('Paris'); await sleep(0)
  city.set('Tokyo'); await sleep(0)
} else if (variant === 'timer5') {
  city.set('Paris'); await sleep(5)
  city.set('Tokyo'); await sleep(5)
}

await sleep(30)

for (const t of trace) {
  if (t.phase === 'end') log(`${t.phase} city=${t.city} aborted=${t.aborted}`)
  else log(`${t.phase} city=${t.city}`)
}
process.exit(0)
