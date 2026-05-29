import type { R2Object, R2ObjectBody, R2Objects } from '@cloudflare/workers-types'

export async function getObject(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return bucket.get(key)
}

export async function headObject(bucket: R2Bucket, key: string): Promise<R2Object | null> {
  return bucket.head(key)
}

export async function putObject(
  bucket: R2Bucket,
  key: string,
  body: ReadableStream | ArrayBuffer | string,
  options?: R2PutOptions
): Promise<R2Object> {
  return bucket.put(key, body, options)
}

export async function deleteObject(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key)
}

export async function deletePrefix(bucket: R2Bucket, prefix: string): Promise<void> {
  await deleteObjectsByPrefix(bucket, prefix)
}

export async function deleteObjectsByPrefix(bucket: R2Bucket, prefix: string): Promise<number> {
  let truncated = true
  let cursor: string | undefined
  let deleted = 0

  while (truncated) {
    const result = await bucket.list({ prefix, cursor })
    truncated = result.truncated
    cursor = result.cursor

    const promises: Promise<void>[] = []
    for (const obj of result.objects) {
      promises.push(bucket.delete(obj.key))
    }
    await Promise.all(promises)
    deleted += promises.length
  }

  return deleted
}

export async function listObjects(
  bucket: R2Bucket,
  prefix: string,
  delimiter?: string,
  limit = 200,
  cursor?: string
): Promise<R2Objects> {
  return bucket.list({ prefix, delimiter, limit, cursor })
}

export async function summarizeObjects(
  bucket: R2Bucket,
  prefix = '',
  pageLimit = 5
): Promise<{ objects: number; storageBytes: number; truncated: boolean }> {
  let cursor: string | undefined
  let truncated = true
  let pages = 0
  let objects = 0
  let storageBytes = 0

  while (truncated && pages < pageLimit) {
    const result = await bucket.list({ prefix, cursor, limit: 1000 })
    pages += 1
    truncated = result.truncated
    cursor = result.cursor

    for (const obj of result.objects) {
      objects += 1
      storageBytes += obj.size
    }
  }

  return {
    objects,
    storageBytes,
    truncated,
  }
}
