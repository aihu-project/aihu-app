import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Release gate for the packaged app's Workers SSR path.
 *
 * This deliberately runs outside Vitest and never imports this repository's
 * source. The app tarball, plus the candidate context/runtime releases, are
 * installed into a fresh consumer and the only framework entry is resolved
 * from that consumer's node_modules.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const appArg = process.argv.find((value) => value.startsWith('--tarball='))
if (!appArg) throw new Error('consumer-workers-ssr requires --tarball=/absolute/path/package.tgz')
const appTarball = resolve(appArg.slice('--tarball='.length))
const consumer = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), 'aihu-app-workers-consumer-'))
const packDir = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), 'aihu-app-peer-packs-'))
const fixtureRoot = join(root, 'tests', 'fixtures')

function packFixture(name) {
  const fixture = join(fixtureRoot, name)
  const output = execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', packDir], {
    cwd: fixture,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, NPM_CONFIG_USERCONFIG: '/dev/null' },
  }).trim().split(/\r?\n/).at(-1)
  if (!output) throw new Error(`npm pack produced no tarball for ${name}`)
  return join(packDir, output)
}

const contextTarball = packFixture('context-contract')
const runtimeTarball = packFixture('runtime-contract')
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2))

// Install every package in one transaction. npm otherwise may prune a packed
// peer on a later no-save install, which would make this gate falsely depend on
// install ordering rather than proving the published package contract.
const registryPeers = [
  '@aihu/arbor@4.1.2',
  '@aihu/router@0.5.0',
  '@aihu/server@0.6.0',
  '@aihu/signals@0.5.1',
  '@aihu/store@0.1.2',
  'vite@8.0.16',
]
execFileSync('npm', [
  'install', '--ignore-scripts', '--legacy-peer-deps', '--no-package-lock', '--prefix', consumer,
  appTarball, contextTarball, runtimeTarball, ...registryPeers,
], { stdio: 'inherit', env: { ...process.env, NPM_CONFIG_USERCONFIG: '/dev/null' } })

const nodeModules = join(consumer, 'node_modules')
const realNodeModules = realpathSync(nodeModules)
function assertInstalled(specifier) {
  const parts = specifier.startsWith('@') ? specifier.split('/') : specifier.split('/')
  const packageName = parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/')
  const subpath = parts.slice(specifier.startsWith('@') ? 2 : 1).join('/')
  const packageJsonPath = join(nodeModules, packageName, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const exportKey = subpath === '' ? '.' : `./${subpath}`
  const entry = packageJson.exports?.[exportKey]
  const importEntry = typeof entry === 'string' ? entry : entry?.import
  if (typeof importEntry !== 'string') throw new Error(`${specifier} has no import export in installed package`)
  const resolved = realpathSync(join(nodeModules, packageName, importEntry))
  if (!resolved.startsWith(realNodeModules + sep)) {
    throw new Error(`${specifier} escaped consumer node_modules: ${resolved}`)
  }
  if (resolved.includes(`${sep}src${sep}`) || resolved.includes(`${sep}tests${sep}`)) {
    throw new Error(`${specifier} resolved to repository source or test fixture: ${resolved}`)
  }
  return resolved
}

writeFileSync(join(consumer, 'probe.mjs'), `
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const consumer = realpathSync(${JSON.stringify(consumer)})
const nodeModules = consumer + ${JSON.stringify(sep + 'node_modules')}
const specs = ['@aihu/app', '@aihu/app/client', '@aihu/app/ssr-document', '@aihu/runtime/app', '@aihu/context', '@aihu/context/ssr']
for (const spec of specs) {
  const resolved = realpathSync(fileURLToPath(import.meta.resolve(spec)))
  if (!resolved.startsWith(nodeModules + ${JSON.stringify(sep)})) throw new Error(spec + ' escaped consumer node_modules: ' + resolved)
  if (resolved.includes(${JSON.stringify(sep + 'src' + sep)}) || resolved.includes(${JSON.stringify(sep + 'tests' + sep)})) throw new Error(spec + ' used source or fixture path: ' + resolved)
}
const runtime = await import('@aihu/runtime/app')
for (const name of ['_setHydrate', '_setMount', '_setSignal', '_withOwnerContext']) {
  if (typeof runtime[name] !== 'function') throw new Error('runtime app bridge missing ' + name)
}
runtime._setMount(() => {})
runtime._setSignal(() => {})
const context = await import('@aihu/context')
const contextSsr = await import('@aihu/context/ssr')
const token = context.createContext('default')
const map = new Map()
contextSsr.runWithContext(map, () => context.provide(token, 'consumer-ssr'))
if (contextSsr.runWithContext(map, () => context.inject(token)) !== 'consumer-ssr') throw new Error('context SSR entry did not preserve a provided value')
await import('@aihu/app')
await import('@aihu/app/ssr-document')
`)
for (const specifier of ['@aihu/app', '@aihu/app/client', '@aihu/app/ssr-document', '@aihu/runtime/app', '@aihu/context', '@aihu/context/ssr']) {
  assertInstalled(specifier)
}
execFileSync(process.execPath, ['probe.mjs'], { cwd: consumer, stdio: 'inherit' })

mkdirSync(join(consumer, 'pages'), { recursive: true })
mkdirSync(join(consumer, 'src', 'components'), { recursive: true })
writeFileSync(join(consumer, 'index.html'), '<!doctype html><html><head><title>consumer</title></head><body><div id="app-root"></div><script type="module" src="/src/main.js"></script></body></html>')
writeFileSync(join(consumer, 'src', 'main.js'), "import { createApp } from '@aihu/app/client'; createApp({ outletId: 'app-root' })")
writeFileSync(join(consumer, 'pages', 'index.aihu'), `@route { name: "consumer-home" }\n@template { <main><h1>packaged consumer ssr</h1><probe-card /><probe-missing /><probe-poison /></main> }`)
writeFileSync(join(consumer, 'src', 'components', 'probe-card.aihu'), `@template { <strong>registered card</strong> }`)
writeFileSync(join(consumer, 'vite.config.mjs'), `
import { defineConfig } from 'vite'
import { viteAihuPlugin } from '@aihu/app'
const poison = process.env.AIHU_CONSUMER_POISON === '1'
const adapter = {
  name: 'consumer-workers',
  async adapt(context) { await context.emitFile('_adapter/manifest.txt', 'consumer-adapter-output\\n') },
  serverEntry: ({ handler }) => 'export default { async fetch(request) { return ' + handler + '(request) } }',
}
const poisonPlugin = {
  name: 'consumer-poison-registry',
  transform(code, id) {
    if (!poison || !id.includes('virtual:aihu-server-components')) return null
    return code.replace('export default {', "export default { 'probe-poison': () => Promise.reject(new Error('consumer poisoned registry entry')), ")
  },
}
export default defineConfig({
  plugins: [viteAihuPlugin({
    output: 'ssr',
    css: { shadowMode: 'light' },
    app: { outletId: 'app-root' },
    dir: { pages: 'pages', components: 'src/components', layouts: 'src/layouts' },
    adapter,
    vite: { build: { outDir: 'dist', emptyOutDir: true } },
  }), poisonPlugin],
})
`)
const consumerConfig = readFileSync(join(consumer, 'vite.config.mjs'), 'utf8')
if (consumerConfig.includes('../../../src') || consumerConfig.includes('aihu-app/src')) {
  throw new Error('packaged consumer introduced a source-tree bypass')
}
if (/\balias\s*:/.test(consumerConfig)) {
  throw new Error('packaged consumer introduced an alias bypass around installed peers')
}

function build(env = {}) {
  execFileSync('npx', ['vite', 'build'], {
    cwd: consumer,
    stdio: 'inherit',
    env: { ...process.env, ...env, AIHU_CONFIG_LOADER_E2E: '1', NPM_CONFIG_USERCONFIG: '/dev/null' },
  })
}

build()
const clientOut = join(consumer, 'dist')
const serverWorker = join(consumer, 'dist-server', '_worker.js')
if (!existsSync(join(clientOut, 'index.html'))) throw new Error('consumer client index.html was not built')
if (!existsSync(join(clientOut, '_adapter', 'manifest.txt'))) throw new Error('consumer adapter output was not emitted')
if (!existsSync(serverWorker)) throw new Error('consumer Workers SSR entry was not built')

async function requestFromWorker(label) {
  const worker = await import(pathToFileURL(serverWorker).href + `?${label}=${Date.now()}`)
  if (typeof worker.default?.fetch !== 'function') throw new Error(`${label}: adapter fetch export missing`)
  return Promise.race([
    worker.default.fetch(new Request('https://consumer.test/'), {}),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: SSR worker request deadlocked`)), 20_000)),
  ])
}

const response = await requestFromWorker('main')
const html = await response.text()
if (response.status !== 200) throw new Error(`main SSR request returned ${response.status}: ${html}`)
if (!html.includes('id="app-root"') || !html.includes('packaged consumer ssr')) throw new Error('custom outlet document was not assembled')
if (html.includes('probe-missing')) throw new Error('missing registry entry leaked into rendered HTML')

build({ AIHU_CONSUMER_POISON: '1' })
const poisoned = await requestFromWorker('poison')
const poisonedHtml = await poisoned.text()
if (poisoned.status !== 200) throw new Error(`poisoned registry request returned ${poisoned.status}: ${poisonedHtml}`)
if (!poisonedHtml.includes('packaged consumer ssr')) throw new Error('poisoned registry removed the working route')

// The packaged gate must remain source-independent. Keep the assertions in the
// script so a future shortcut to ../../../src or a fixture alias fails loudly.
assertInstalled('@aihu/app')
console.log(`packaged Workers SSR consumer passed: ${consumer}`)
