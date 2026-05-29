import type { Bindings } from '../src/env'

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Bindings {}
}
