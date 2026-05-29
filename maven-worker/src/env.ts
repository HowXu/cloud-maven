export type RepositoryVisibility = 'PUBLIC' | 'PRIVATE' | 'HIDDEN'

export type RepositoryPolicy = {
  visibility: RepositoryVisibility
  allowReleaseRedeploy: boolean
  allowSnapshotRedeploy: boolean
}

export type Bindings = {
  MAVEN_BUCKET: R2Bucket
  MAVEN_KV: KVNamespace
  ADMIN_BOOTSTRAP_TOKEN?: string
  SESSION_TTL_SECONDS?: string
  DEFAULT_REPOSITORY_POLICY?: string
}

export type Variables = {
  requestId: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
