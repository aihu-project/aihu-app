import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  define: { __DEV__: 'true' },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: false,
    exclude: ['**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@aihu/runtime/app': fileURLToPath(new URL('./tests/__stubs__/runtime-app.ts', import.meta.url)),
      'virtual:aihu-components': fileURLToPath(new URL('./tests/__stubs__/aihu-components.ts', import.meta.url)),
      'virtual:aihu-layouts': fileURLToPath(new URL('./tests/__stubs__/aihu-layouts.ts', import.meta.url)),
      'virtual:aihu-routes': fileURLToPath(new URL('./tests/__stubs__/aihu-routes.ts', import.meta.url)),
    },
  },
})
