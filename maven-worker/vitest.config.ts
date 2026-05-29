import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  wrangler: {
    configPath: './wrangler.toml'
  },
  test: {
    globals: true
  }
})
