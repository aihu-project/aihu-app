import { existsSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = process.cwd()
const sentinel = 'npm-credential-regression-sentinel'
const temp = mkdtempSync(join(tmpdir(), 'aihu-app-credential-'))
const userConfig = join(temp, 'user.npmrc')
const globalConfig = join(temp, 'global.npmrc')
const projectConfig = join(root, '.npmrc')
const credentialTerms = ['auth', 'token', 'username', 'password', 'email', 'certfile', 'keyfile']
const isCredentialEnv = (key) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  return (normalized.includes('npm') || normalized.includes('node')) && credentialTerms.some((term) => normalized.includes(term))
}
writeFileSync(userConfig, '')
writeFileSync(globalConfig, '')
const baseEnv = { ...process.env, NPM_CONFIG_USERCONFIG: userConfig, NPM_CONFIG_GLOBALCONFIG: globalConfig }
for (const key of Object.keys(baseEnv)) if (isCredentialEnv(key)) delete baseEnv[key]
baseEnv.NPM_CONFIG_USERCONFIG = userConfig
baseEnv.NPM_CONFIG_GLOBALCONFIG = globalConfig
const run = (env) => spawnSync(process.execPath, ['scripts/release-contract.mjs'], { cwd: root, env, encoding: 'utf8' })
const assertRejected = (label, result) => {
  const output = `${result.stdout}\n${result.stderr}`
  if (result.status === 0 || output.includes(sentinel)) {
    console.error(`npm credential regression failed: ${label}`)
    process.exit(1)
  }
}
if (run(baseEnv).status !== 0) {
  console.error('npm credential regression failed: controlled empty configs were rejected')
  process.exit(1)
}
for (const key of [
  'NPM_CONFIG_USERNAME', 'npm_config_username', 'NPM_CONFIG_PASSWORD', 'npm_config__password',
  'NPM_CONFIG_EMAIL', 'npm_config_certfile', 'NPM_CONFIG_KEYFILE',
  'npm_config_//registry.npmjs.org/:_authToken', 'NPM_CONFIG_//registry.npmjs.org/:_auth',
  'npm_config_//registry.npmjs.org/:username', 'npm_config_//registry.npmjs.org/:_password',
  'npm_config_//registry.npmjs.org/:email', 'npm_config_//registry.npmjs.org/:certfile',
  'npm_config_//registry.npmjs.org/:keyfile',
]) assertRejected(`environment ${key}`, run({ ...baseEnv, [key]: sentinel }))
const keys = ['_authToken', '_auth', 'authToken', 'username', '_password', 'password', 'email', 'certfile', 'keyfile']
const configKeys = [...keys, ...keys.map((key) => `//registry.npmjs.org/:${key}`), ...['username', 'password', 'email', 'certfile', 'keyfile'].map((key) => `@scope:${key}`)]
if (existsSync(projectConfig)) {
  console.error('npm credential regression requires no existing project .npmrc')
  process.exit(1)
}
try {
  for (const [label, path] of [['project', projectConfig], ['default-user', userConfig], ['global', globalConfig]]) {
    for (const key of configKeys) {
      writeFileSync(path, `${key}=${sentinel}\n`)
      assertRejected(`${label} config ${key}`, run(baseEnv))
    }
    writeFileSync(path, '')
  }
} finally {
  if (existsSync(projectConfig)) unlinkSync(projectConfig)
}
console.log('npm credential regressions passed')
