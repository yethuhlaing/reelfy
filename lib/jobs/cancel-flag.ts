import { redis } from '@/lib/externals/redis'

function cancelStoryKey(storyId: string): string {
  return `cancel:story:${storyId}`
}

export async function setStoryCancelled(storyId: string): Promise<void> {
  await redis.set(cancelStoryKey(storyId), '1', { ex: 3600 })
}

export async function isStoryCancelled(storyId: string): Promise<boolean> {
  return (await redis.get(cancelStoryKey(storyId))) != null
}

export async function clearStoryCancelled(storyId: string): Promise<void> {
  await redis.del(cancelStoryKey(storyId))
}
