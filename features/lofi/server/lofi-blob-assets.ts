import { isManagedUrl, uploadObject, urlToKey } from '@/shared/lib/storage/r2'

export type LofiAssetKind = 'music' | 'visual' | 'stock-music'

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
  const ext = extFromContentType(params.contentType, params.kind)
  const path = lofiAssetPath(params.storyId, params.assetId, params.kind, ext)
  return uploadObject(path, params.data, params.contentType)
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
    if (isManagedUrl(asset.resultUrl)) urls.add(urlToKey(asset.resultUrl))
  }
  if (isManagedUrl(finalVideoUrl)) urls.add(urlToKey(finalVideoUrl))
  return [...urls]
}
