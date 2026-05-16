# UI-PR1 — Routing Shell + Sidebar + Top-bar

Goal: Convert single-page app into multi-page SaaS shell with persistent sidebar (categories) and top-bar (credits/avatar/theme). Foundation for all later UI PRs.
Depends on: none.

## Why
- Current `app/page.tsx` is one big canvas. No room for `/dashboard`, `/settings`, or future categories.
- All later UI PRs (dashboard cards, workspace redesign, notifications, settings) assume route-scoped shell.
- Category roadmap needs sidebar nav slot now so stories can be filtered/scoped per category later without re-layout.

## Routing layout

```
/                          → redirect to /dashboard
/dashboard                 → grid of stories (UI-PR2)
/[category]/new            → create flow (UI-PR3)
/[category]/story/[id]     → workspace (UI-PR4..7)
/settings                  → tabs (UI-PR-future)
```

`[category]` segment for future scaling. Only `stickman` enabled day-1.

## Changes

### 1. Root layout
File: [app/layout.tsx](app/layout.tsx)

- Wrap children with `<ThemeProvider>` + `<ToastProvider>` (stub for UI-PR8) + `<SidebarProvider>` (collapse state).
- Two-column shell: `<Sidebar />` + `<main>{topbar + children}</main>`.
- `<TopBar />` rendered inside main, sticky top.

### 2. Sidebar
New file: `components/Sidebar.tsx`

Sections:
- Logo + collapse toggle (top)
- `+ New Story` primary CTA → routes to `/[activeCategory]/new`
- **Categories** header
  - `◈ Stickman` active link → sets active category (URL or context)
  - Disabled rows: `Whiteboard (soon)`, `Comic (soon)`, etc. (rendered grey, not clickable)
- Footer: avatar circle + credits pill (stub `◈ —`) + `⚙ Settings` link

Behavior:
- Collapsed mode: 64px icon-rail, tooltips on hover.
- Persist collapse state in `localStorage` key `sidebar:collapsed`.
- Active category derived from URL `params.category` or stored fallback (`localStorage` `category:active` default `stickman`).

### 3. Top-bar
New file: `components/TopBar.tsx`

Layout:
- Left: page title slot (children prop). Workspace page passes story title later.
- Right: 🔔 bell placeholder (UI-PR8 will fill), `<CreditsPill />`, `<AvatarMenu />`.

### 4. Avatar menu + credits pill
New files: `components/AvatarMenu.tsx`, `components/CreditsPill.tsx`

- AvatarMenu dropdown: Account, Settings, Theme submenu, Sign out (stubs — no backend yet).
- CreditsPill: shows `◈ —` for now. Layout slot reserved so future credits don't shift layout.

### 5. Theme
New files: `components/ThemeToggle.tsx`, `components/theme-provider.tsx` (refactor existing if present)

- System default. Toggle: light / dark / system.
- Persist in `localStorage` key `theme`.
- Both palettes ship day-1. Dark = primary brand.

### 6. Page stubs
New files:
- `app/dashboard/page.tsx` → empty placeholder (UI-PR2 fills)
- `app/[category]/new/page.tsx` → renders existing `StoryInput` for now (UI-PR3 redesigns)
- `app/[category]/story/[id]/page.tsx` → relocates current `app/page.tsx` content intact (refactored in UI-PR4)
- `app/settings/page.tsx` → "Coming soon" placeholder
- `app/page.tsx` → redirect to `/dashboard` (use Next redirect helper)

### 7. Storage migration
File: [lib/storage.ts](lib/storage.ts)

- Add `category: string` to story records (default `"stickman"` for existing entries).
- Migration on load: any record without `category` gets `stickman`.

## Files added
- `components/Sidebar.tsx`
- `components/TopBar.tsx`
- `components/AvatarMenu.tsx`
- `components/CreditsPill.tsx`
- `components/ThemeToggle.tsx`
- `app/dashboard/page.tsx`
- `app/[category]/new/page.tsx`
- `app/[category]/story/[id]/page.tsx`
- `app/settings/page.tsx`

## Files modified
- `app/layout.tsx`
- `app/page.tsx` (becomes redirect)
- `components/theme-provider.tsx` (system/light/dark)
- `lib/storage.ts` (category field + migration)
- `styles/globals.css` or app CSS (sidebar/topbar tokens, dark/light palettes)

## Verification
- `/` redirects to `/dashboard`.
- Sidebar collapse persists across reload.
- Theme toggle flips palette; system mode respects OS.
- Switching active category in sidebar updates URL.
- Existing localStorage stories load with `category: "stickman"`.
- No regression: workspace at `/stickman/story/[id]` still functions identically to old single-page app.
