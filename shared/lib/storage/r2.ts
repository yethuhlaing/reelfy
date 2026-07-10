import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { env } from '@/shared/lib/env'

/**
 * Cloudflare R2 storage. Private bucket, public read served ONLY through the
 * Cloudflare CDN domain (NEXT_PUBLIC_CDN_URL). Objects are stored at
 * unguessable keys; there is no per-user signing.
 */

const ONE_YEAR_IMMUTABLE = 'public, max-age=31536000, immutable'

function requireR2(): {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
} {
  const accountId = env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  const bucket = env.R2_BUCKET_NAME
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('R2 storage is not configured')
  }
  return { accountId, accessKeyId, secretAccessKey, bucket }
}

let cachedClient: S3Client | null = null

function client(): { s3: S3Client; bucket: string } {
  const { accountId, accessKeyId, secretAccessKey, bucket } = requireR2()
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return { s3: cachedClient, bucket }
}

/** Public CDN origin, no trailing slash. */
function cdnOrigin(): string {
  const raw = env.NEXT_PUBLIC_CDN_URL
  if (!raw) throw new Error('NEXT_PUBLIC_CDN_URL is not configured')
  return raw.replace(/\/$/, '')
}

/** Public URL for a stored key. */
export function publicUrl(key: string): string {
  return `${cdnOrigin()}/${key.replace(/^\//, '')}`
}

/** True when a URL points at our CDN origin (replaces the old blob-host check). */
export function isManagedUrl(url: string | null | undefined): url is string {
  if (!url || url.startsWith('data:')) return false
  try {
    return new URL(url).hostname === new URL(cdnOrigin()).hostname
  } catch {
    return false
  }
}

/** Strip CDN origin + query from a public URL back to its bare object key. */
export function urlToKey(url: string): string {
  const withoutQuery = url.split('?')[0] ?? url
  const origin = cdnOrigin()
  if (withoutQuery.startsWith(`${origin}/`)) {
    return withoutQuery.slice(origin.length + 1)
  }
  try {
    return new URL(withoutQuery).pathname.replace(/^\//, '')
  } catch {
    return withoutQuery.replace(/^\//, '')
  }
}

/**
 * Upload an object. Overwrites any existing object at the same key (R2 default).
 * Callers own key generation, including any random suffix. Returns the public URL.
 */
export async function uploadObject(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const { s3, bucket } = client()
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
      CacheControl: ONE_YEAR_IMMUTABLE,
    }),
  )
  return publicUrl(key)
}

export interface DeleteResult {
  deleted: number
  failed: number
}

/** Batch-delete a set of keys (up to 1000 per call, idempotent). */
export async function deleteByKeys(keys: string[]): Promise<DeleteResult> {
  return deleteKeys(keys)
}

async function deleteKeys(keys: string[]): Promise<DeleteResult> {
  const summary: DeleteResult = { deleted: 0, failed: 0 }
  if (keys.length === 0) return summary
  const { s3, bucket } = client()
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    try {
      const res = await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      )
      const failed = res.Errors?.length ?? 0
      summary.failed += failed
      summary.deleted += batch.length - failed
    } catch {
      summary.failed += batch.length
    }
  }
  return summary
}

/** List every key under a prefix and batch-delete them (paginated). */
export async function deleteByPrefix(prefix: string): Promise<DeleteResult> {
  const { s3, bucket } = client()
  const summary: DeleteResult = { deleted: 0, failed: 0 }
  let continuationToken: string | undefined
  try {
    do {
      const listed = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      )
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => Boolean(k))
      const res = await deleteKeys(keys)
      summary.deleted += res.deleted
      summary.failed += res.failed
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
    } while (continuationToken)
  } catch {
    summary.failed += 1
  }
  return summary
}
