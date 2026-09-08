import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const temp = mkdtempSync(resolve(tmpdir(), 'aihu-app-peers-'))
writeFileSync(resolve(temp, 'package.json'), '{"private":true}\n')
execFileSync('npm', [
  'install', '--ignore-scripts', '--legacy-peer-deps', '--no-package-lock',
  '@aihu/arbor@4.1.2', '@aihu/router@0.5.0', '@aihu/server@0.6.0',
  '@aihu/signals@0.5.1', '@aihu/store@0.1.2', '@aihu/runtime@6.1.0',
], { cwd: temp, stdio: 'inherit', env: { ...process.env, NPM_CONFIG_USERCONFIG: '/dev/null' } })
cpSync(resolve(temp, 'node_modules', '@aihu'), resolve(root, 'node_modules', '@aihu'), {
  recursive: true,
  force: true,
  verbatimSymlinks: true,
})
rmSync(temp, { recursive: true, force: true })
for (const name of ['context-contract']) {
  const fixture = resolve(root, 'tests', 'fixtures', name)
  const packageName = '@aihu/context'
  const target = resolve(root, 'node_modules', packageName)
  mkdirSync(resolve(target, '..'), { recursive: true })
  rmSync(target, { recursive: true, force: true })
  cpSync(fixture, target, { recursive: true })
}
