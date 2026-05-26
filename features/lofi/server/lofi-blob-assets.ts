import { put } from '@vercel/blob'
import { env } from '@/shared/lib/env'

export type LofiAssetKind = 'music' | 'visual' | 'stock-music'

const BLOB_HOST = 'blob.vercel-storage.com'

function stripQuery(url: string): string {
  return url.split('?')[0] ?? url
}

function isBlobUrl(url: string | null | undefined): url is string {
  if (!url || url.startsWith('data:')) return false
  try {
    return new URL(url).hostname.includes(BLOB_HOST)
  } catch {
    return false
  }
}

function requireBlobToken(): void {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }
}

export function lofiAssetPrefixes(storyId: string): string[] {
  return [
    `lofi/music/${storyId}/`,
    `lofi/visual/${storyId}/`,
    `lofi/stock-music/${storyId}/`,
  ]
}

export function lofiAssetPath(
  storyId: string,
  assetId: string,
  kind: LofiAssetKind,
  ext: string,
): string {
  const folder = kind === 'stock-music' ? 'stock-music' : kind
  return `lofi/${folder}/${storyId}/${assetId}.${ext}`
}

function extFromContentType(contentType: string, kind: LofiAssetKind): string {
  if (kind === 'music' || kind === 'stock-music') return 'mp3'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('webm')) return 'webm'
  return 'mp4'
}

export async function downloadToBuffer(
  sourceUrl: string,
): Promise<{ data: Buffer; contentType: string }> {
  const res = await fetch(sourceUrl, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const data = Buffer.from(await res.arrayBuffer())
  return { data, contentType }
}

export async function uploadLofiAsset(params: {
  storyId: string
  assetId: string
  kind: LofiAssetKind
  data: Buffer
  contentType: string
}): Promise<string> {
  requireBlobToken()
  const ext = extFromContentType(params.contentType, params.kind)
  const path = lofiAssetPath(params.storyId, params.assetId, params.kind, ext)
  const blob = await put(path, params.data, {
    access: 'public',
    contentType: params.contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return blob.url
}

export async function rehostToLofiBlob(params: {
  storyId: string
  assetId: string
  kind: LofiAssetKind
  sourceUrl: string
}): Promise<string> {
  const { data, contentType } = await downloadToBuffer(params.sourceUrl)
  return uploadLofiAsset({
    storyId: params.storyId,
    assetId: params.assetId,
    kind: params.kind,
    data,
    contentType,
  })
}

export function collectLofiBlobUrls(
  assets: { resultUrl: string | null }[],
  finalVideoUrl: string | null,
): string[] {
  const urls = new Set<string>()
  for (const asset of assets) {
    if (isBlobUrl(asset.resultUrl)) urls.add(stripQuery(asset.resultUrl))
  }
  if (isBlobUrl(finalVideoUrl)) urls.add(stripQuery(finalVideoUrl))
  return [...urls]
}
