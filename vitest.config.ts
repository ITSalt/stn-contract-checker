import { defineConfig } from 'vitest/config'

// Engine tests run in node; UI and design-system tests opt into jsdom with
// `// @vitest-environment jsdom` and import their setup file themselves.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // A clean machine (node:22 container, cold jsdom start) runs the UI tests slower than the 5 s default.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
