export const CURATED_CATEGORIES = [
  { id: 'cfdfdd53-195a-6b6c-bc54-d665859b445b', name: 'Lofi' },
  { id: '91ca6cf0-08d4-0e57-e024-2fd0e1413327', name: 'Chill' },
  { id: 'b5bc7541-bdc2-d42a-3986-572fddd29753', name: 'Ambient' },
  { id: '871f1ab8-d0f4-0573-8e22-9e995cf4fd6f', name: 'Relaxing' },
  { id: '78b17c21-bfb1-90ae-5240-e59d82c5ef3a', name: 'Calm' },
  { id: '6f0fe64f-5795-2876-6fd3-cdaedda1634f', name: 'Aesthetic' },
  { id: '6c8635a6-8f38-924f-b6ac-c1a8a609e84d', name: 'Vlog' },
  { id: '93371cc5-be9f-fe83-a6e6-42735fa551b8', name: 'Peaceful' },
  { id: '212dbef5-8532-f318-8c4a-f3f2dde20e8a', name: 'Meditative' },
  { id: 'b85381db-9105-41aa-2ca0-0aa1c9a80223', name: 'Electronic' },
  { id: '8a9ec7d9-4a38-ad1c-4d45-0421efb81c9d', name: 'Upbeat' },
  { id: 'f96cc1c5-9172-b0e2-6c63-eb3f3eff5598', name: 'Cinematic' },
] as const

export type BrowseTab = 'popular' | 'new' | 'staff' | 'random'

export const BROWSE_TABS: { value: BrowseTab; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'new', label: 'New' },
  { value: 'staff', label: 'Staff Picks' },
  { value: 'random', label: 'Random' },
]

export type StockStep = 'playlist' | 'setup' | 'visuals' | 'review'
