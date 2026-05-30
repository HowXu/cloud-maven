import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityFlags: ['export_commonjs_default']
        }
      }
    }
  }
})
