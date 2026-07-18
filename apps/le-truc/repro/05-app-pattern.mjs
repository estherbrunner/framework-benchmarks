// Repro 5: mirror the weather app's exact reactive topology.
//   - a "city" state
//   - a Task that reads city, awaits a delay, returns data
//   - a match effect for visibility (createEffect form)
//   - a watch-on-task that calls list.set() (simulated via createEffect reading task)
//   - a reconciler effect reading list.keys()
// Then: three rapid-ish city writes with setTimeout gaps (like Playwright clicks).
//
// Does the third Task (Tokyo) run?

import { createState, createTask, createEffect, match, createList } from '@zeix/cause-effect'

const city = createState('London')
const started = []
const okRuns = []
const derivedRuns = []
const reconcileRuns = []

const weather = createTask(async (_prev, signal) => {
  const c = city.get()
  started.push(c)
  await new Promise(r => setTimeout(r, 10))
  if (signal.aborted) throw new DOMException('aborted', 'AbortError')
  return { city: c, daily: { time: ['d1', 'd2'] } }
})

const list = createList([], { keyConfig: (i) => i.date })

// subscriber 1: match for visibility
createEffect(() => match(weather, {
  nil: () => {},
  ok: (d) => { okRuns.push(d.city) },
  err: () => {},
  stale: () => {},
}))

// subscriber 2: derive list from task (what watch(weather, fn) compiles to)
createEffect(() => {
  try {
    const data = weather.get()
    derivedRuns.push(data.city)
    list.set(data.daily.time.map(t => ({ date: t, high: 20 })))
  } catch { /* nil */ }
})

// subscriber 3: reconciler reads list keys
createEffect(() => {
  const keys = Array.from(list.keys())
  reconcileRuns.push(keys.length)
})

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

await sleep(30)   // let London settle

// Three writes with ~realistic gaps (no artificial rapid-batching)
for (const [c, gap] of [['Paris', 50], ['Tokyo', 50]]) {
  city.set(c)
  await sleep(gap)
}
await sleep(50)

console.log('Tasks started:   ', JSON.stringify(started))
console.log('ok-handler ran:   ', JSON.stringify(okRuns))
console.log('derived-watch ran:', JSON.stringify(derivedRuns))
console.log('reconciler ran:   ', JSON.stringify(reconcileRuns))
console.log('Expected: all three cities (London, Paris, Tokyo) appear, Tokyo wins')
process.exit(0)
