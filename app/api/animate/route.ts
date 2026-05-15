import { put } from '@vercel/blob'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'
import { getVideoProvider } from '@/lib/providers/video'
import type { VideoModel } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

// Parse duration from ffmpeg stderr: "Duration: HH:MM:SS.ss"
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, ['-i', filePath])
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    // ffmpeg exits 1 when no output is specified — that's expected
    proc.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
      if (!match) return reject(new Error('Could not parse audio duration'))
      const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3])
      resolve(secs)
    })
    proc.on('error', reject)
  })
}

// LTX-Video requires (n-1) % 8 == 0, valid range [9, 257] at 24fps
function durationToFrames(durationSec: number, fps = 24): number {
  const ideal = Math.round(durationSec * fps)
  const snapped = Math.round((ideal - 1) / 8) * 8 + 1
  return Math.max(9, Math.min(257, snapped))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { storyId, sceneId, imageUrl, motionPrompt, voiceoverUrl, videoModel } = body as {
    storyId?: string
    sceneId?: string
    imageUrl?: string
    motionPrompt?: string
    voiceoverUrl?: string
    videoModel?: VideoModel
  }

  if (!storyId || !sceneId || !imageUrl || !motionPrompt) {
    return badRequest('Missing required fields: storyId, sceneId, imageUrl, motionPrompt')
  }

  if (!process.env.FAL_KEY) {
    return badRequest('FAL_KEY is not configured')
  }

  const provider = getVideoProvider(videoModel)
  let numFrames = 121 // default ~5s
  let tmpDir: string | null = null

  try {
    if (voiceoverUrl) {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stickman-animate-'))
      const audioPath = path.join(tmpDir, `${sceneId}-audio.mp3`)
      await downloadToFile(voiceoverUrl, audioPath)
      const duration = await getAudioDuration(audioPath)
      numFrames = durationToFrames(duration)
    }

    const falVideoUrl = await provider.generate(imageUrl, motionPrompt, {
      numFrames,
      fps: 24,
      width: 1280,
      height: 720,
    })

    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN
    let videoUrl: string

    if (hasBlobToken) {
      const res = await fetch(falVideoUrl)
      const buf = Buffer.from(await res.arrayBuffer())
      const blob = await put(`animations/${storyId}-${sceneId}.mp4`, buf, {
        access: 'public',
        contentType: 'video/mp4',
        addRandomSuffix: false,
        allowOverwrite: true,
      })
      videoUrl = blob.url
    } else {
      videoUrl = falVideoUrl
    }

    return Response.json({ videoUrl })
  } catch (err) {
    console.error('FAL animate error:', err)
    const msg = err instanceof Error
      ? (err.message || err.constructor.name + ': ' + JSON.stringify(err))
      : JSON.stringify(err)
    return new Response(JSON.stringify({ error: msg }), { status: 500 })
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
  }
}
