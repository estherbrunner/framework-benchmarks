// Repro 6: use Le Truc's defineComponent + expose + host to test whether
// host.city writes propagate to a Task when rapid-clicked.
//
// This mirrors the weather-app topology exactly but in a minimal Node DOM.
// We use linkedom for a minimal HTMLElement polyfill.

import { JSDOM } from 'jsdom'
import { defineComponent, createTask, createEffect, match, createList } from '@zeix/le-truc'

const dom = new JSDOM('<!DOCTYPE html><weather-app></weather-app>', { url: 'http://localhost/' })
global.window = dom.window
global.document = dom.window.document
global.navigator = dom.window.navigator
global.HTMLElement = dom.window.HTMLElement
global.customElements = dom.window.customElements
global.localStorage = { getItem: () => null, setItem: () => {} }

const started = []

defineComponent('weather-app', ({ expose, host, watch }) => {
  expose({ city: 'London' })

  const weather = createTask(async (_prev, signal) => {
    const c = host.city
    started.push(c)
    await new Promise(r => setTimeout(r, 10))
    if (signal.aborted) throw new DOMException('aborted', 'AbortError')
    return { city: c }
  })

  createEffect(() => match(weather, {
    nil: () => {}, ok: () => {}, err: () => {}, stale: () => {}
  }))

  // expose a setter we can call from outside
  global.__setCity = (c) => { host.city = c }
  global.__getCity = () => host.city
})

// Trigger upgrade
const el = document.createElement('weather-app')
document.body.appendChild(el)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
await sleep(30)

console.log('After init, started:', JSON.stringify(started))

global.__setCity('Paris')
await sleep(50)
global.__setCity('Tokyo')
await sleep(50)

console.log('After Paris+Tokyo, started:', JSON.stringify(started))
console.log('Expected: ["London","Paris","Tokyo"]')
process.exit(0)
