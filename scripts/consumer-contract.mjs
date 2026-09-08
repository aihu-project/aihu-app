import { cpSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = process.argv.find((value) => value.startsWith('--tarball='))
if (!arg) throw new Error('consumer-contract requires --tarball=/absolute/path/package.tgz')
const tarball = resolve(arg.slice('--tarball='.length))
const fixtureMode = process.argv.includes('--fixtures')
const consumer = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), 'aihu-app-consumer-'))

writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2))
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
  tarball, ...registryPeers,
], { stdio: 'inherit', env: { ...process.env, NPM_CONFIG_USERCONFIG: '/dev/null' } })

if (fixtureMode) {
  for (const [name, fixture] of [['@aihu/context', 'context-contract'], ['@aihu/runtime', 'runtime-contract']]) {
    const target = join(consumer, 'node_modules', name)
    mkdirSync(dirname(target), { recursive: true })
    cpSync(join(root, 'tests', 'fixtures', fixture), target, { recursive: true, force: true })
  }
} else {
  for (const spec of ['@aihu/context@0.2.1', '@aihu/runtime@6.1.1']) {
    execFileSync('npm', ['install', '--ignore-scripts', '--no-package-lock', '--prefix', consumer, spec], {
      stdio: 'inherit', env: { ...process.env, NPM_CONFIG_USERCONFIG: '/dev/null' },
    })
  }
}

const virtualPlugin = {
  name: 'consumer-virtuals',
  resolveId(id) {
    return id.startsWith('virtual:aihu-') ? '\0consumer-' + id.slice('virtual:'.length) : null
  },
  load(id) {
    if (!id.startsWith('\0consumer-')) return null
    if (id.endsWith('components')) return 'export default {}'
    if (id.endsWith('layouts')) return 'export default {}'
    if (id.endsWith('routes')) return 'export default []'
    return 'export default {}'
  },
}
writeFileSync(join(consumer, 'index.html'), '<!doctype html><div id="outlet"></div><script type="module" src="/src/main.js"></script>')
mkdirSync(join(consumer, 'src'), { recursive: true })
writeFileSync(join(consumer, 'src', 'main.js'), "import { createApp } from '@aihu/app/client'; createApp()")
writeFileSync(join(consumer, 'vite.config.mjs'), `export default { plugins: [{
  name: 'consumer-virtuals',
  resolveId(id) { return id.startsWith('virtual:aihu-') ? '\\0consumer-' + id.slice('virtual:'.length) : null },
  load(id) { if (!id.startsWith('\\0consumer-')) return null; if (id.endsWith('components')) return 'export default {}'; if (id.endsWith('layouts')) return 'export default {}'; if (id.endsWith('routes')) return 'export default []'; return 'export default {}' }
}] }`)
writeFileSync(join(consumer, 'probe.mjs'), `
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = realpathSync(${JSON.stringify(consumer)})
for (const name of ['@aihu/app', '@aihu/app/client', '@aihu/app/ssr-document']) {
  const file = realpathSync(fileURLToPath(await import.meta.resolve(name)))
  if (!file.startsWith(root + ${JSON.stringify(sep)})) throw new Error(name + ' escaped consumer node_modules: ' + file)
}
await import('@aihu/app')
await import('@aihu/app/ssr-document')
`)
execFileSync(process.execPath, ['probe.mjs'], { cwd: consumer, stdio: 'inherit' })
execFileSync('npx', ['vite', 'build'], { cwd: consumer, stdio: 'inherit' })
if (!fixtureMode) {
  execFileSync('npm', ['install', '--ignore-scripts', '--no-package-lock', '--prefix', consumer, '@aihu-plugin/agent-readiness@2.3.0'], {
    stdio: 'inherit', env: { ...process.env, NPM_CONFIG_USERCONFIG: '/dev/null' },
  })
  const { viteAgentReadinessIntegration } = await import(pathToFileURL(join(consumer, 'node_modules/@aihu-plugin/agent-readiness/dist/index.js')).href)
  if (viteAgentReadinessIntegration({ name: 'consumer-opt-in' }).name === undefined) throw new Error('optional agent integration did not load')
}
console.log(`isolated consumer passed: ${consumer}`)
