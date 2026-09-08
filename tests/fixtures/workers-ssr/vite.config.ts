import { viteAihuPlugin } from '../../../src/index.ts'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const outletVariant = process.env.AIHU_E2E_OUTLET === '1'
const poisonVariant = process.env.AIHU_E2E_POISON === '1'
const variant = outletVariant ? 'outlet' : poisonVariant ? 'poison' : 'main'

const variantPlugin = {
  name: 'workers-ssr-variant-probes',
  transformIndexHtml: {
    order: 'pre',
    handler: (html: string) => (outletVariant ? html.replace('id="outlet"', "id='app-root'") : html),
  },
  transform(code: string, id: string) {
    if (!poisonVariant || !id.includes('virtual:aihu-server-components')) return null
    return code.replace(
      'export default {',
      "export default { 'probe-poison': () => Promise.reject(new Error('poisoned component')),",
    )
  },
}

const adapter = {
  name: 'fixture-adapter',
  async adapt(context: { outDir: string; emitFile(path: string, content: string): Promise<void> }) {
    await context.emitFile('_adapter/manifest.txt', 'adapter-output\n')
  },
  serverEntry: ({ handler }: { handler: string }) =>
    `export default { async fetch(request) { return ${handler}(request) } }`,
}

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@aihu/runtime/ssr': fileURLToPath(new URL('../runtime-contract/ssr.js', import.meta.url)),
      '@aihu/runtime/app': fileURLToPath(new URL('../runtime-contract/app.js', import.meta.url)),
      '@aihu/runtime': fileURLToPath(new URL('../runtime-contract/index.js', import.meta.url)),
    },
  },
  plugins: [
    viteAihuPlugin({
      output: 'ssr',
      css: { shadowMode: 'light' },
      dir: { pages: 'pages', components: 'src/components', layouts: 'src/layouts' },
      adapter,
      ...(outletVariant ? { app: { outletId: 'app-root' } } : {}),
      vite: { build: { outDir: `dist-${variant}`, emptyOutDir: true } },
    }),
    variantPlugin,
  ],
})
