// @vitest-environment node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, 'fixtures/workers-ssr')
const clientOut = resolve(root, 'dist-main')
const serverOut = resolve(root, 'dist-main-server')

function build(env: Record<string, string> = {}) {
  execFileSync('npx', ['vite', 'build'], {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, ...env, AIHU_CONFIG_LOADER_E2E: '1', AIHU_NATIVE_SKIP: '1' },
  })
}

describe('workers SSR consumer build', () => {
  it('builds real Vite client/server output and invokes the adapter', () => {
    rmSync(clientOut, { recursive: true, force: true })
    rmSync(serverOut, { recursive: true, force: true })
    build()
    expect(existsSync(resolve(clientOut, 'index.html'))).toBe(true)
    expect(existsSync(resolve(serverOut, '_worker.js'))).toBe(true)
    expect(readFileSync(resolve(clientOut, '_adapter/manifest.txt'), 'utf8')).toBe('adapter-output\n')
  }, 120_000)

  it('keeps the built worker loadable and handles a request without deadlocking', async () => {
    const worker = resolve(serverOut, '_worker.js')
    const mod = await import(`${worker}?e2e=${Date.now()}`)
    expect(typeof mod.default?.fetch).toBe('function')
    const response = await Promise.race([
      mod.default.fetch(new Request('https://example.test/'), {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SSR worker request deadlocked')), 20_000)),
    ])
    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(600)
  }, 30_000)

  it('builds a custom outlet and tolerates a poisoned registry entry', () => {
    build({ AIHU_E2E_OUTLET: '1' })
    expect(readFileSync(resolve(root, 'dist-outlet/index.html'), 'utf8')).toContain("id='app-root'")
    build({ AIHU_E2E_POISON: '1' })
    expect(existsSync(resolve(root, 'dist-poison-server/_worker.js'))).toBe(true)
  }, 120_000)
})
