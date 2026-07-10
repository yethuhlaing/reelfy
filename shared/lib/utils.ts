import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shouldShowToastFor(storyId: string, pathname: string, visible: boolean): boolean {
  if (!visible) return true
  return !pathname.includes(`/story/${storyId}`)
}

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/$/, '')
const MARKETING_VIDEOS_PATH = '/marketing/videos'

/** Public marketing clips (landing bento, hero, waitlist). Served from R2/CDN when configured. */
export function marketingVideoUrl(filename: string): string {
  const name = filename.replace(/^\//, '').replace(/^videos\//, '')
  if (CDN_URL) {
    return `${CDN_URL}${MARKETING_VIDEOS_PATH}/${name}`
  }
  return `/videos/${name}`
}
