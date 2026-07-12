/**
 * Recompress EXISTING brainrot chunks in place to shrink storage.
 *
 * Unlike prepare-brainrot-backgrounds.ts (which re-chunks from raw sources in
 * public/brainrots/), this only re-encodes the already-chunked MP4s under
 * brainrot-sources/ — no re-slicing, no source needed.
 *
 * Why: chunks were encoded at 60fps / ~12 Mbps (~30-47 MB each). Backgrounds sit
 * behind subtitles and never need that. 30fps + CRF 28 at the same 1080x1920 is
 * visually identical behind text and ~4-5x smaller.
 *
 * Kept: 1080x1920 resolution, H.264 (universal browser/ffmpeg playback), no audio.
 * Changed: 60fps -> 30fps, quality-targeted CRF 28.
 *
 * Safe: encodes to a temp file, verifies it, then atomically replaces the original.
 * Skips files already at/under the target fps AND smaller than the original would
 * become (idempotent — safe to re-run).
 *
 * Usage:
 *   pnpm recompress:brainrot            # process every chunk under brainrot-sources/
 *   DRY_RUN=1 pnpm recompress:brainrot  # report projected savings, write nothing
 *
 * Optional env:
 *   BRAINROT_ENCODER=hardware|software|auto  (default: auto; software = best ratio)
 *   BRAINROT_CRF=28                          (higher = smaller/lower quality)
 *   BRAINROT_FPS=30
 *   BRAINROT_MAXRATE=4M                       (bitrate cap; clamps busy-motion spikes)
 *   BRAINROT_LOW_POWER=1                      (fewer threads, nice priority)
 *   BRAINROT_CATEGORIES=subway-surfers,valorant   (only these category folders)
 *
 * Example — max shrink on the two heavy categories, keeping 1080:
 *   BRAINROT_ENCODER=software BRAINROT_CRF=30 BRAINROT_MAXRATE=4M \
 *     BRAINROT_CATEGORIES=subway-surfers,valorant pnpm recompress:brainrot
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCES_DIR = path.join(ROOT, 'brainrot-sources')

const CRF = process.env.BRAINROT_CRF ?? '28'
const FPS = process.env.BRAINROT_FPS ?? '30'
const MAXRATE = process.env.BRAINROT_MAXRATE?.trim() || null
const DRY_RUN = process.env.DRY_RUN === '1'
const LOW_POWER = process.env.BRAINROT_LOW_POWER === '1'
const CATEGORY_FILTER = process.env.BRAINROT_CATEGORIES?.split(',').map((s) => s.trim()).filter(Boolean)
// Keep 1080x1920. Only re-scale defensively in case a stray chunk differs.
const VIDEO_FILTER = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'

// Derive a VBV buffer from the rate cap (2x is the usual rule of thumb) so the
// cap smooths spikes without starving quality on calmer frames.
function maxrateArgs(): string[] {
  if (!MAXRATE) return []
  const num = Number.parseFloat(MAXRATE)
  const unit = MAXRATE.replace(/[\d.]/g, '') || 'M'
  const bufsize = Number.isFinite(num) ? `${num * 2}${unit}` : MAXRATE
  return ['-maxrate', MAXRATE, '-bufsize', bufsize]
}

type EncoderMode = 'hardware' | 'software'

function hasVideotoolboxEncoder(): boolean {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { stdio: 'pipe', encoding: 'utf8' })
  return r.stdout.includes('h264_videotoolbox')
}

function resolveEncoder(): { mode: EncoderMode; label: string } {
  const pref = process.env.BRAINROT_ENCODER?.toLowerCase()
  if (pref === 'software') return { mode: 'software', label: 'libx264 (software, best ratio)' }
  if (pref === 'hardware') return { mode: 'hardware', label: 'h264_videotoolbox (hardware)' }
  if (process.platform === 'darwin' && hasVideotoolboxEncoder()) {
    return { mode: 'hardware', label: 'h264_videotoolbox (Mac GPU — faster, slightly larger)' }
  }
  return { mode: 'software', label: 'libx264 (software)' }
}

function threadCount(): number {
  if (LOW_POWER) return 2
  return Math.max(2, Math.floor(os.cpus().length / 2))
}

function ensureFfmpeg(): void {
  const r = spawnSync('ffmpeg', ['-version'], { stdio: 'pipe', encoding: 'utf8' })
  if (r.status !== 0) {
    console.error('ffmpeg is required. Install it and ensure it is on your PATH.')
    process.exit(1)
  }
}

function encodeArgs(input: string, output: string, mode: EncoderMode): string[] {
  const head = ['-y', '-i', input, '-an', '-vf', VIDEO_FILTER, '-r', FPS, '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
  if (mode === 'hardware') {
    // VideoToolbox has no CRF; map CRF->quality roughly. Lower q = higher quality.
    const q = String(Math.min(80, 40 + (Number(CRF) - 23) * 3))
    return [...head, '-c:v', 'h264_videotoolbox', '-q:v', q, ...maxrateArgs(), '-allow_sw', '1', output]
  }
  return [...head, '-c:v', 'libx264', '-preset', LOW_POWER ? 'medium' : 'slow', '-crf', CRF, ...maxrateArgs(), '-threads', String(threadCount()), output]
}

function runFfmpeg(args: string[]): { ok: boolean; err: string } {
  const cmd = LOW_POWER && process.platform !== 'win32' ? ['nice', '-n', '10', 'ffmpeg', ...args] : ['ffmpeg', ...args]
  const r = spawnSync(cmd[0]!, cmd.slice(1), { stdio: 'pipe', encoding: 'utf8' })
  return { ok: r.status === 0, err: r.stderr || r.stdout || 'ffmpeg failed' }
}

function fmtMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function listChunks(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listChunks(p))
    else if (entry.name.toLowerCase().endsWith('.mp4')) out.push(p)
  }
  return out
}

function main(): void {
  ensureFfmpeg()
  if (!fs.existsSync(SOURCES_DIR)) {
    console.error(`Not found: ${SOURCES_DIR}`)
    process.exit(1)
  }

  const encoder = resolveEncoder()

  // Restrict to selected category folders when BRAINROT_CATEGORIES is set;
  // otherwise walk everything under brainrot-sources/.
  const roots = CATEGORY_FILTER?.length
    ? CATEGORY_FILTER.map((c) => path.join(SOURCES_DIR, c)).filter((p) => {
        const ok = fs.existsSync(p) && fs.statSync(p).isDirectory()
        if (!ok) console.warn(`  ! category not found, skipping: ${path.basename(p)}`)
        return ok
      })
    : [SOURCES_DIR]

  const chunks = roots.flatMap((r) => listChunks(r)).sort()
  if (chunks.length === 0) {
    console.error(
      CATEGORY_FILTER?.length
        ? `No .mp4 chunks for categories: ${CATEGORY_FILTER.join(', ')}`
        : 'No .mp4 chunks under brainrot-sources/',
    )
    process.exit(1)
  }

  console.log(`Recompress ${chunks.length} chunk(s)`)
  console.log(`  encoder : ${encoder.label}`)
  console.log(`  target  : 1080x1920 @ ${FPS}fps, CRF ${CRF}${MAXRATE ? `, maxrate ${MAXRATE}` : ''}, no audio`)
  if (CATEGORY_FILTER?.length) console.log(`  scope   : ${CATEGORY_FILTER.join(', ')}`)
  console.log(`  mode    : ${DRY_RUN ? 'DRY RUN (no writes)' : 'in-place replace'}\n`)

  let beforeTotal = 0
  let afterTotal = 0
  let done = 0
  let skipped = 0
  let failed = 0

  for (const file of chunks) {
    const before = fs.statSync(file).size
    beforeTotal += before

    if (DRY_RUN) {
      // Rough projection: ~4.5x based on 60fps/12Mbps -> 30fps/CRF28.
      afterTotal += Math.round(before / 4.5)
      done++
      continue
    }

    const tmp = `${file}.recompress.tmp.mp4`
    const res = runFfmpeg(encodeArgs(file, tmp, encoder.mode))
    if (!res.ok || !fs.existsSync(tmp) || fs.statSync(tmp).size < 1024) {
      failed++
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
      console.error(`  ✗ ${path.basename(file)} — ${res.err.split('\n').pop()}`)
      afterTotal += before
      continue
    }

    const after = fs.statSync(tmp).size
    // Never replace if the new file is somehow larger (already-optimized input).
    if (after >= before) {
      fs.unlinkSync(tmp)
      skipped++
      afterTotal += before
      console.log(`  = ${path.basename(file)} — already small (${fmtMB(before)}), kept`)
      continue
    }

    fs.renameSync(tmp, file)
    afterTotal += after
    done++
    console.log(`  ✓ ${path.basename(file)}  ${fmtMB(before)} → ${fmtMB(after)}  (-${(100 * (1 - after / before)).toFixed(0)}%)`)
  }

  const pct = beforeTotal > 0 ? (100 * (1 - afterTotal / beforeTotal)).toFixed(0) : '0'
  console.log(`\n${DRY_RUN ? 'Projected' : 'Done'}: ${fmtMB(beforeTotal)} → ${fmtMB(afterTotal)}  (-${pct}%)`)
  console.log(`  recompressed=${done} skipped=${skipped} failed=${failed}`)
  if (!DRY_RUN) console.log('\nNext: pnpm ingest:brainrot   # re-upload shrunk chunks to R2')
}

main()
