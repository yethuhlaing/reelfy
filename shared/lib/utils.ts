import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shouldShowToastFor(storyId: string, pathname: string, visible: boolean): boolean {
  if (!visible) return true
  return !pathname.includes(`/story/${storyId}`)
}

const BLOB_STORAGE_URL = process.env.NEXT_PUBLIC_BLOB_STORAGE_URL?.replace(/\/$/, '')
const MARKETING_VIDEOS_PATH = '/marketing/videos'

/** Public marketing clips (landing bento, hero, waitlist). Served from Vercel Blob when configured. */
export function marketingVideoUrl(filename: string): string {
  const name = filename.replace(/^\//, '').replace(/^videos\//, '')
  if (BLOB_STORAGE_URL) {
    return `${BLOB_STORAGE_URL}${MARKETING_VIDEOS_PATH}/${name}`
  }
  return `/videos/${name}`
}
