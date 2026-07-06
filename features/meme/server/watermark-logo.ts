import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const LOGO_PATH = path.join(process.cwd(), 'public/logos/logo.png')

let logoSource: Buffer | null = null

async function getLogoSource(): Promise<Buffer> {
  if (!logoSource) {
    logoSource = await readFile(LOGO_PATH)
  }
  return logoSource
}

/** Bottom-right logo watermark sized relative to the meme canvas. */
export async function watermarkLogoComposite(
  memeWidth: number,
  memeHeight: number,
): Promise<{ input: Buffer; top: number; left: number }> {
  const logoHeight = Math.max(40, Math.round(memeHeight * 0.1))
  const margin = Math.max(10, Math.round(memeHeight * 0.02))

  const source = await getLogoSource()
  const { data, info } = await sharp(source)
    .resize({ height: logoHeight, fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Knock out the logo file's black matte so it reads on any meme background.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    if (r < 40 && g < 40 && b < 40) {
      data[i + 3] = 0
    } else {
      data[i + 3] = Math.min(255, Math.round((data[i + 3] ?? 255) * 0.92))
    }
  }

  const logo = await sharp(data, { raw: info }).png().toBuffer()
  const meta = await sharp(logo).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  return {
    input: logo,
    top: memeHeight - height - margin,
    left: memeWidth - width - margin,
  }
}
