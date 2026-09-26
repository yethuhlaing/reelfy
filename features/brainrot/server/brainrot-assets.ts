import { uploadObject } from '@/shared/lib/storage/r2'

export async function uploadBrainrotVoiceover(projectId: string, data: Buffer): Promise<string> {
  return uploadObject(`brainrot/${projectId}/voiceover.mp3`, data, 'audio/mpeg')
}

export async function uploadBrainrotOutput(projectId: string, data: Buffer): Promise<string> {
  return uploadObject(`brainrot/${projectId}/output.mp4`, data, 'video/mp4')
}

/**
 * The composed reel, before captions. Rehosted rather than left on fal so a
 * subtitle-only retry after fal's ~1h result window still has a video.
 */
export async function uploadBrainrotComposed(projectId: string, data: Buffer): Promise<string> {
  return uploadObject(`brainrot/${projectId}/composed.mp4`, data, 'video/mp4')
}
