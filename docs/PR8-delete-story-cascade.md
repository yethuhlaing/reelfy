# PR8 — Delete Story Cascade (Bucket A)

Goal: Delete story → confirm dialog → cancel in-flight jobs → purge all blob artifacts → clear job records → clear localStorage.
Depends on: PR6 (cancel-all + webhook idempotency), PR7 (Redis store + `deleteJobsForStory`).

## Why
- Current `deleteStory` only clears localStorage. Orphan blobs accumulate (`thumbnails/`, `scenes/`, `voiceovers/`, `animations/`, `composed/`).
- No confirmation — accidental click loses work.
- In-flight jobs continue after delete, write to deleted storyId → more orphans.

## Changes

### 1. Storage path migration
File: [app/api/generate/route.ts](app/api/generate/route.ts) line 88

Change:
```ts
`scenes/${Date.now()}-${scene.id}.${ext}`
```
to:
```ts
`scenes/${storyId}/${scene.id}-${Date.now()}.${ext}`
```

Requires passing `storyId` into generate request body. Add to client `handleGenerate` in `app/page.tsx` — generate a `storyId` (uuid) up front, pass to `/api/generate`, use for downstream operations. Currently storyId only created on save. Move creation earlier.

Old stories with `scenes/{ts}-*` path: handled via `legacyUrls` fallback below.

### 2. DELETE route
New file: `app/api/stories/[id]/route.ts`

```ts
import { del, list } from '@vercel/blob'
import { setStoryCancelled, deleteJobsForStory } from '...'

export async function DELETE(req: Request, ctx) {
  const { id: storyId } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const legacyUrls: string[] = body.legacyUrls ?? []

  // 1. Cancel in-flight (sets Redis flag + cancels fal jobs + markFailed)
  await fetch(`${origin}/api/stories/${storyId}/cancel`, { method: 'POST' })

  // 2. Delete blob artifacts by storyId prefix (new layout)
  const prefixes = [
    `thumbnails/${storyId}`,
    `scenes/${storyId}/`,
    `voiceovers/${storyId}/`,
    `animations/${storyId}-`,
    `composed/${storyId}`,
  ]
  const summary = { deleted: 0, failed: 0 }
  for (const prefix of prefixes) {
    const { blobs } = await list({ prefix })
    for (const b of blobs) {
      try { await del(b.url); summary.deleted++ } catch { summary.failed++ }
    }
  }

  // 3. Legacy scenes/ URLs (no storyId in path)
  for (const url of legacyUrls) {
    try { await del(url); summary.deleted++ } catch { summary.failed++ }
  }

  // 4. Delete job records + index
  await deleteJobsForStory(storyId)

  return Response.json({ ok: true, ...summary })
}
```

Note: `animations/{storyId}-{sceneId}.mp4` — prefix `animations/${storyId}-` works because sceneId follows hyphen.

### 3. Confirm dialog
File: [components/RecentStories.tsx](components/RecentStories.tsx)

Replace × button onClick with `AlertDialog` from [components/ui/alert-dialog.tsx](components/ui/alert-dialog.tsx).
```
Title: "Delete story?"
Description: "This permanently deletes the story and all generated files (images, voiceovers, animations, composed video). Cannot be undone."
Action: "Delete" (destructive variant) → calls onDelete(id), shows spinner until promise resolves, then closes.
Cancel: "Keep"
```

State: `const [deletingId, setDeletingId] = useState<string | null>(null)` — disables action button while pending.

`onDelete` prop signature changes to `async (id) => Promise<void>` so dialog can await.

### 4. Client delete handler
File: [app/page.tsx](app/page.tsx) `handleDeleteRecent`

```ts
const handleDeleteRecent = async (id: string) => {
  const stored = getStory(id)
  const legacyUrls = stored?.storyData.scenes
    .map(s => s.imageUrl)
    .filter((u): u is string => !!u && u.includes('/scenes/') && !u.includes(`/scenes/${id}/`)) ?? []

  const res = await fetch(`/api/stories/${id}`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ legacyUrls }),
  })
  if (!res.ok) {
    toast({ title: 'Delete failed', description: 'Try again.', variant: 'destructive' })
    throw new Error('delete failed')
  }
  const summary = await res.json()
  if (summary.failed > 0) {
    toast({ title: 'Deleted with warnings', description: `${summary.failed} files could not be removed.` })
  }
  deleteStory(id)
  const next = listStories()
  setRecent(next)
  if (id === storyId) {
    stopPlayback()
    setStoryId(null)
    setStoryData(null)
    setStoryInput('')
  }
}
```

Order: server 200 → localStorage clears. Failure → keeps localStorage so user retries.

### 5. Global "Stop story" button
File: [app/page.tsx](app/page.tsx) panel header (where `story-title` lives ~line 513)

Button → confirms → calls `POST /api/stories/${storyId}/cancel`. Stops in-flight without deleting.

## Files added
- `app/api/stories/[id]/route.ts`

## Files modified
- `app/api/generate/route.ts` (storyId in scene path, accept storyId in body)
- `components/RecentStories.tsx` (AlertDialog, async onDelete)
- `app/page.tsx` (early storyId creation, async delete handler, global stop button)

## Verification
- New story → delete → all 5 blob prefixes empty for that storyId. Job set + records gone. localStorage cleared. Toast confirms.
- Legacy story → delete → scenes images deleted via `legacyUrls`, other prefixes via storyId prefix.
- In-flight animate → delete → cancel-all marks failed → webhook lands later → sees `failed` → skips put (PR6 fix). No orphan animations/.
- Server 500 → localStorage retained, toast shows error, item still in list.
- Confirm dialog spinner shows during 1-5s cascade. Buttons disabled. No double-click.
