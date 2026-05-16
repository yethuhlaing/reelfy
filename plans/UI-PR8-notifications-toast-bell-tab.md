# UI-PR8 — Async Notifications (toast + bell + tab title flash)

Goal: Three-layer notification system so users don't miss async job completions when they navigate away from the workspace. Local-only (no backend).
Depends on: UI-PR1.

## Why
- Animate + export jobs run minutes and complete via webhook (PR4/5 backend).
- Users may switch story, browse dashboard, or minimize tab. Currently they have no signal except returning to the workspace.
- Three layers (toast, bell, tab title) cover three contexts: in-app different page, missed/returning, minimized window.

## Changes

### 1. Notification store
New file: `lib/notifications.ts`

Local storage-backed store, last 20 events:
```ts
interface Notification {
  id: string
  type: 'scene-animated' | 'scene-failed' | 'export-done' | 'export-failed' | 'generation-failed' | 'generation-complete'
  storyId: string
  sceneId?: string
  message: string
  link: string  // e.g. /stickman/story/[id]
  createdAt: number
  read: boolean
}

export const notifications = {
  add(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): void
  list(): Notification[]
  markRead(id: string): void
  markAllRead(): void
  unreadCount(): number
  clear(): void
}
```

Backed by `localStorage` key `notifications:v1`. Subscribe via lightweight pub-sub for React updates.

### 2. Toast system
New files:
- `components/Toast.tsx` — single toast UI (icon, message, optional link, close X)
- `components/ToastProvider.tsx` — context exposing `pushToast({ type, message, link?, ttl? })`
- `hooks/use-toast.ts` — `const { push } = useToast()`

Stacking: bottom-right, vertical stack, auto-dismiss after 5s (configurable). Hover pauses TTL.

ToastProvider mounted in `app/layout.tsx`.

### 3. Notification bell
New files:
- `components/NotificationBell.tsx` — bell icon in top-bar with unread badge dot
- `components/NotificationCenter.tsx` — dropdown panel listing last 20 notifications

Behaviors:
- Bell click → opens dropdown, marks visible items read on open (after small delay).
- Each row: icon (success/error/info), message, "2m ago", click → navigate to `link`.
- Empty state: "No recent activity"
- Footer: `Clear all` button.

Replace placeholder bell from UI-PR1.

### 4. Tab title flash
New file: `hooks/use-tab-title.ts`

```ts
export function useTabTitle(unreadCount: number) {
  useEffect(() => {
    const base = 'StickStory'
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base
  }, [unreadCount])
}
```

Mounted at top-bar level. Restores base title when notifications all read or window focused.

Also: on `focus` event → mark visible bell-dropdown items read? No — keep that explicit (click bell). Just update tab title.

### 5. Job event → notification wiring
File: `lib/jobs/use-poller.ts`

Extend hook signature:
```ts
useJobPoller({
  pending,
  onCompleted,
  onFailed,
  notifyContext?: { storyId, scenes: Scene[] } // for richer messages
})
```

Inside `onCompleted` callback wrapper (provided by workspace page):
- If user currently on `/stickman/story/[currentStoryId]` AND `currentStoryId === completedScene.storyId` AND page visible → suppress toast (in-card state already shows it).
- Otherwise: push toast `Scene N animated — Open` (link to `/stickman/story/[id]#scene-N`) + add to notifications store.
- Same for failures: red toast + notification.

Export completion (UI-PR9 wires) and generation completion (workspace page) follow same pattern.

### 6. "Generation complete" / "Generation failed" events
File: `app/[category]/story/[id]/page.tsx`

When SSE completes successfully → if user has navigated away from this story (visibility change OR pathname mismatch) → push notification.

When SSE errors → push toast + notification regardless.

### 7. Visibility tracking
Use `document.visibilityState` and pathname (via Next router) to decide toast suppression.

Helper: `lib/should-notify.ts`
```ts
export function shouldShowToastFor(storyId: string, pathname: string, visible: boolean): boolean {
  if (!visible) return true
  return !pathname.startsWith(`/stickman/story/${storyId}`)
}
```

### 8. Bell badge
- Red dot top-right of bell when `unreadCount > 0`.
- Numeric badge `1` / `2` ... `9+` for ≥1.

### 9. Sample story exclusion
- Notifications NOT generated for sample story (`id === 'sample'`).

## Files added
- `lib/notifications.ts`
- `components/Toast.tsx`
- `components/ToastProvider.tsx`
- `hooks/use-toast.ts`
- `components/NotificationBell.tsx`
- `components/NotificationCenter.tsx`
- `hooks/use-tab-title.ts`
- `lib/should-notify.ts`

## Files modified
- `app/layout.tsx` (mount ToastProvider)
- `components/TopBar.tsx` (real bell)
- `lib/jobs/use-poller.ts` (notify integration via callbacks — keep hook pure, fire callbacks)
- `app/[category]/story/[id]/page.tsx` (wire onCompleted/onFailed/generation events to notifications)

## Verification
- Animate a scene while on `/dashboard` → toast appears bottom-right + bell badge increments + tab title shows `(1) StickStory`.
- Click toast `Open` → navigates to scene in workspace.
- Click bell → dropdown shows the event, marks read.
- Tab title returns to `StickStory` when unread = 0.
- Animate while ON the workspace page for that story → NO toast (in-card state suffices).
- Animate fails while on dashboard → red toast + bell + tab.
- Generation completes while on /dashboard → toast.
- Reload page → bell history persists (localStorage).
- Clear all → empties store + clears badge.
