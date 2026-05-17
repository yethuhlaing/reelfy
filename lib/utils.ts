import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shouldShowToastFor(storyId: string, pathname: string, visible: boolean): boolean {
  if (!visible) return true
  return !pathname.includes(`/story/${storyId}`)
}
