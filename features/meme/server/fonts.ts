import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MemeBoxStyle } from '@/shared/lib/types'

/** Satori font descriptor. Satori requires ArrayBuffer, not Node Buffer. */
export interface LoadedFont {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

const FONTS_DIR = join(process.cwd(), 'public', 'fonts')

// Cache font buffers across invocations (Fluid Compute reuses instances).
let cache: LoadedFont[] | null = null

export async function loadMemeFonts(): Promise<LoadedFont[]> {
  if (cache) return cache
  const [anton, inter] = await Promise.all([
    readFile(join(FONTS_DIR, 'Anton-Regular.ttf')),
    readFile(join(FONTS_DIR, 'Inter-Bold.ttf')),
  ])
  // Inter is registered at 400 + 700 (same static Bold file) so Satori's default
  // weight lookup always resolves. Variable fonts break Satori's glyph loader.
  const interData = toArrayBuffer(inter)
  cache = [
    { name: 'Anton', data: toArrayBuffer(anton), weight: 400, style: 'normal' },
    { name: 'Inter', data: interData, weight: 400, style: 'normal' },
    { name: 'Inter', data: interData, weight: 700, style: 'normal' },
  ]
  return cache
}

/** Font family used by each style preset. Shared with the client CSS contract. */
export function fontFamilyForStyle(style: MemeBoxStyle): string {
  switch (style) {
    case 'impact-outline':
      return 'Anton'
    default:
      return 'Inter'
  }
}
