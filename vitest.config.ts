import { defineConfig } from 'vitest/config'

// Engine tests run in node; UI and design-system tests opt into jsdom with
// `// @vitest-environment jsdom` and import their setup file themselves.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
