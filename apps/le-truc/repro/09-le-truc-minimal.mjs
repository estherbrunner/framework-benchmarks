// Repro 9 harness: drives 09-le-truc-minimal.html through the Vite dev server.
// Toggles the subscriber variant (A = watch(task,fn), B = createEffect read)
// by rewriting the VARIANT const in the HTML file before page load.
//
// Run from repo root:
//   (cd apps/le-truc && npm run dev > /tmp/dev.log 2>&1 &)
//   node apps/le-truc/repro/09-le-truc-minimal.mjs [A|B]   (default A)
//   pkill -f vite

import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const VARIANT = process.argv[2] || 'A'
if (!['A', 'B'].includes(VARIANT)) {
  console.error('usage: node 09-le-truc-minimal.mjs [A|B]')
  process.exit(1)
}

const here = dirname(fileURLToPath(import.meta.url))
const htmlPath = join(here, '09-le-truc-minimal.html')
const original = readFileSync(htmlPath, 'utf8')
writeFileSync(htmlPath, original.replace(/const VARIANT = '[AB]'/, `const VARIANT = '${VARIANT}'`))

const browser = await chromium.launch()
const page = await browser.newPage()

const lines = []
page.on('console', msg => {
  const t = msg.text()
  if (t.startsWith('REPRO ')) lines.push(t.slice(6))
})
page.on('pageerror', err => console.log('PAGEERROR:', err.message.slice(0, 200)))

try {
  await page.goto('http://localhost:3000/repro/09-le-truc-minimal.html')
  // Wait for the initial Task to run — but don't crash if it never does
  // (that's exactly the bug we're demonstrating for variant A).
  await page.waitForFunction(
    () => (window.__reproLog || []).some(l => l.startsWith('task END')),
    null,
    { timeout: 5000 }
  ).catch(() => {/* timeout = Task never ran; fall through to cycles */})

  await page.evaluate(() => window.__cycle()).catch(() => {})
  await page.waitForTimeout(100)
  await page.evaluate(() => window.__cycle()).catch(() => {})
  await page.waitForTimeout(100)
  await page.evaluate(() => window.__cycle()).catch(() => {})
  await page.waitForTimeout(400)

  const started = lines.filter(l => l.startsWith('task START')).map(l => l.match(/city=(\w)/)?.[1])

  console.log(`=== Variant ${VARIANT} ===`)
  for (const l of lines) console.log(' ', l)
  console.log(`\nTask ran for cities: ${JSON.stringify(started)}`)
  if (VARIANT === 'A') {
    console.log('BUG: should be ["A","B","C","D"] but watch(task,fn) never subscribed.')
  } else {
    console.log('OK: all writes propagated; createEffect subscription works.')
  }
} finally {
  // Restore the file so git status stays clean
  writeFileSync(htmlPath, original)
  await browser.close()
}

