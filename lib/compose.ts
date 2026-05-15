import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegPath from 'ffmpeg-static'

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => (stderr += d.toString()))
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1000)}`))
    })
    proc.on('error', reject)
  })
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
}

// Video clip from LTX-Video MP4 + voiceover: loop video to match audio length
async function clipFromVideo(
  videoPath: string,
  audioPath: string,
  outPath: string
): Promise<void> {
  await runFfmpeg([
    '-stream_loop', '-1',
    '-i', videoPath,
    '-i', audioPath,
    '-filter_complex', '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=fps=24[v]',
    '-map', '[v]',
    '-map', '1:a',
    '-shortest',
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    '-y', outPath,
  ])
}

// Ken Burns clip from static PNG + voiceover: slow zoom-in, stops when audio ends
async function clipFromImage(
  imagePath: string,
  audioPath: string,
  outPath: string
): Promise<void> {
  const kenBurns =
    "[0:v]scale=1920:1080:force_original_aspect_ratio=increase," +
    "crop=1920:1080," +
    "zoompan=z='min(zoom+0.0015,1.3)':d=720:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'," +
    "fps=fps=24,setsar=1,format=yuv420p[v]"

  await runFfmpeg([
    '-loop', '1',
    '-i', imagePath,
    '-i', audioPath,
    '-filter_complex', kenBurns,
    '-map', '[v]',
    '-map', '1:a',
    '-shortest',
    '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    '-y', outPath,
  ])
}

export interface ComposeScene {
  id: string
  imageUrl?: string | null
  videoUrl?: string | null
  voiceoverUrl?: string | null
}

export async function composeStory(scenes: ComposeScene[]): Promise<Buffer> {
  const viable = scenes.filter((s) => s.voiceoverUrl && (s.imageUrl || s.videoUrl))
  if (viable.length === 0) {
    throw new Error('No composable scenes — each scene needs a voiceover and an image or video clip')
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stickman-compose-'))

  try {
    const clipPaths = await Promise.all(
      viable.map(async (scene) => {
        const audioPath = path.join(tmpDir, `${scene.id}-audio.mp3`)
        const outPath = path.join(tmpDir, `${scene.id}-clip.mp4`)

        await downloadToFile(scene.voiceoverUrl!, audioPath)

        if (scene.videoUrl) {
          const videoPath = path.join(tmpDir, `${scene.id}-video.mp4`)
          await downloadToFile(scene.videoUrl, videoPath)
          await clipFromVideo(videoPath, audioPath, outPath)
        } else {
          const imagePath = path.join(tmpDir, `${scene.id}-image`)
          await downloadToFile(scene.imageUrl!, imagePath)
          await clipFromImage(imagePath, audioPath, outPath)
        }

        return outPath
      })
    )

    if (clipPaths.length === 1) {
      return await fs.readFile(clipPaths[0])
    }

    const concatListPath = path.join(tmpDir, 'concat.txt')
    await fs.writeFile(concatListPath, clipPaths.map((p) => `file '${p}'`).join('\n'))

    const finalPath = path.join(tmpDir, 'final.mp4')
    await runFfmpeg([
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y', finalPath,
    ])

    return await fs.readFile(finalPath)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}
