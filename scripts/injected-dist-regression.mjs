import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = process.cwd()
const injected = join(root, 'dist', 'injected-dist-regression.js')
const temp = mkdtempSync(join(tmpdir(), 'aihu-app-npmrc-'))
writeFileSync(injected, 'injected')
try {
  const env = { ...process.env, NPM_CONFIG_USERCONFIG: join(temp, 'user.npmrc'), NPM_CONFIG_GLOBALCONFIG: join(temp, 'global.npmrc') }
  for (const key of Object.keys(env)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    if ((normalized.includes('npm') || normalized.includes('node')) && (normalized.includes('auth') || normalized.includes('token'))) delete env[key]
  }
  const result = spawnSync(process.execPath, ['scripts/release-contract.mjs'], { cwd: root, env, encoding: 'utf8' })
  if (result.status === 0 || !`${result.stdout}\n${result.stderr}`.includes('dist contains files outside the exact allowlist')) {
    console.error('injected dist regression: release contract accepted an unallowlisted dist file')
    process.exit(1)
  }
  console.log('injected dist regression passed')
} finally {
  unlinkSync(injected)
}
