import { uploadObject } from '@/shared/lib/storage/r2'

export async function uploadBrainrotVoiceover(projectId: string, data: Buffer): Promise<string> {
  return uploadObject(`brainrot/${projectId}/voiceover.mp3`, data, 'audio/mpeg')
}

export async function uploadBrainrotOutput(projectId: string, data: Buffer): Promise<string> {
  return uploadObject(`brainrot/${projectId}/output.mp4`, data, 'video/mp4')
}
