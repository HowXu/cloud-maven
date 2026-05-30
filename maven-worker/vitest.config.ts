import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        main: './src/index.ts',
        miniflare: {
          compatibilityFlags: ['export_commonjs_default'],
          kvNamespaces: { MAVEN_KV: 'cloud-maven' },
          r2Buckets: { MAVEN_BUCKET: 'cloud-maven' },
        }
      }
    }
  }
})
