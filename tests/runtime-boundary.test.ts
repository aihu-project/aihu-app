import { describe, expect, it } from 'vitest'
import { viteAihuPlugin } from '../src/vite-plugin.ts'

function names(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value]).flatMap((plugin) => {
    if (plugin && typeof plugin === 'object' && 'name' in plugin) return [String(plugin.name)]
    return []
  })
}

describe('optional agent-readiness boundary', () => {
  it('keeps the base app plugin graph importable without opt-in', () => {
    const plugins = viteAihuPlugin()
    expect(names(plugins)).toContain('aihu-agent-readiness-disabled')
  })

  it('loads the optional integration only when explicitly configured', async () => {
    const plugins = viteAihuPlugin({ agentReadiness: { name: 'app' } })
    const agent = (Array.isArray(plugins) ? plugins : [plugins]).find(
      (plugin) => plugin && typeof plugin === 'object' && 'then' in plugin,
    )
    expect(agent).toBeDefined()
    const resolved = await agent
    expect((resolved as { name?: string }).name).toMatch(/agent/)
  })
})
