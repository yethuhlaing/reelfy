# Reelify — Business & Product Context

> **Canonical reference for copy, UI, prompts, and feature work.**  
> When writing landing text, in-app labels, SEO, or AI prompts, start here.  
> For SEO constants (keywords, URLs, titles), also see [`shared/lib/seo.ts`](../shared/lib/seo.ts).  
> For billing numbers, see [`features/billing/server/plans.ts`](../features/billing/server/plans.ts).

---

## Company at a glance

| Field | Value |
|-------|--------|
| **Product name** | Reelify |
| **Website** | https://reelify.me |
| **Twitter** | @reelify |
| **Category** | AI content creation platform (video + audio) |
| **Primary keyword** | AI video generator for creators |
| **Repo name** | `stickman` (legacy/internal; public brand is **Reelify**) |

### One-liner

**Reelify is the AI video platform for creators** — generate explainers, lofi tracks, ASMR, and cartoon videos in seconds, with no editing skills needed.

### Elevator pitch (short)

Reelify is an all-in-one AI content creation platform built for **YouTubers, educators, and digital creators**. Turn ideas into publish-ready stickman explainers, long-form lofi background videos, ASMR audio, and cartoon animations from a single web studio — no timeline editing required.

### Elevator pitch (long)

Creators spend hours on storyboards, voiceover, music beds, and export settings. Reelify automates that pipeline: you describe the story or vibe, AI plans scenes or loops, generates visuals and audio, and delivers downloadable MP4s. Start free on credits, upgrade when you need watermark-free exports, higher limits, and priority generation.

---

## What we do (core value)

1. **Reduce time-to-publish** — minutes instead of days for common creator formats.
2. **Lower the skills bar** — no Premiere/Final Cut required for MVP outputs.
3. **Unify formats** — one account, one dashboard, multiple content types (stickman, lofi, and planned formats).
4. **Credit-based fairness** — pay for generation usage; preview costs before heavy jobs where supported.

### What we are not

- A general-purpose video editor (no multi-track NLE replacement).
- A stock music marketplace (lofi uses generated/arranged loops, not a browse-and-license catalog — see [`docs/lofi/`](lofi/) for pipeline details).
- An auto-YouTube uploader (upload is user-managed post-export for MVP).

---

## Who we serve

| Audience | Use cases |
|----------|-----------|
| **YouTubers & faceless channels** | Explainer shorts, lofi livestreams, ambient study channels |
| **Founders & marketers** | Product explainers, launch stories, pitch narratives |
| **Educators** | Concept explainers, step-by-step lessons |
| **Indie creators** | Quick social clips, narrative hooks, background content |

### Jobs to be done

- “I have a story or script — turn it into a watchable video.”
- “I need 1–2 hours of lofi visuals + music for a stream or channel.”
- “I want consistent character/style across scenes without hiring an animator.”
- “I want to experiment with formats before committing to a production stack.”

---

## Brand voice & messaging

Use this tone across landing pages, emails, and in-app copy:

| Do | Avoid |
|----|--------|
| Confident, creator-first (“your story”, “publish faster”) | Corporate jargon (“synergy”, “leverage”) |
| Concrete outcomes (“explainer in minutes”, “long-hour lofi”) | Vague “AI magic” without format names |
| Friendly expert — approachable, not childish | Over-hype (“revolutionary”, “10x your life”) |
| Format-specific names (Stickman, Lofi, etc.) | Internal codenames (`stickman-generator`) in user-facing text |

### Hero & primary headlines (marketing)

- **Headline pattern:** “Animate Your Story With AI”
- **Supporting line:** Reelify is the AI video platform for creators — generate explainers, lofi tracks, ASMR, and cartoon videos in seconds. No editing skills needed.
- **Social proof placeholders (landing):** “10K+ videos this month”, “+20K tracks & loops generated this week” — treat as marketing stats unless wired to real analytics.

---

## Product lines

### Live today (`status: available`)

#### 1. Stickman explainer videos

| | |
|--|--|
| **Route** | `/stickman/new`, dashboard under stories (`category: stickman`) |
| **Tagline** | Visual storytelling, fast |
| **Best for** | Founder stories, product explainers, educational content, YouTube-style ~55–60s narratives |
| **Output** | Hand-drawn stickman scenes, AI voiceover, motion on stills, thumbnail, export MP4 |
| **Story arc** | Hook → problem/journey → resolution (enforced in generation prompts) |

**User-facing description:**  
Simple characters, expressive scenes, clear narrative arc. Best for founder stories, product explainers, and educational content.

**SEO keyword cluster:** stickman video maker AI, AI stickman explainer video, explainer video AI maker (see `SEO.keywords.stickman`).

---

#### 2. Lofi (long-form ambient video + music)

| | |
|--|--|
| **Route** | `/lofi/new`, unified dashboard via `stories` (`category: lofi`) |
| **Tagline** | Ambient visuals with music |
| **Best for** | Background content, study playlists, chill brand moments, 1–2 hour videos |
| **Output** | Lo-fi aesthetic visuals + arranged AI/generated music loops, single MP4 download |
| **Technical docs** | [`docs/lofi/README.md`](lofi/README.md), [`docs/lofi-stock/`](lofi-stock/) |

**User-facing description:**  
Lo-fi aesthetics with auto-generated music and calm motion. Perfect for background content, study playlists, and chill brand moments.

**SEO keyword cluster:** AI lofi music generator, lofi background music AI, long hour lofi AI (see `SEO.keywords.lofi`).

---

### Marketed in SEO & roadmap (not all live in app picker)

These appear in metadata, sitemap, and schema.org — use for landing/SEO copy; verify route availability before linking CTAs.

| Format | Sitemap slug | Status |
|--------|--------------|--------|
| ASMR songs & sounds | `asmr` | Roadmap / SEO |
| Cartoon video | `cartoon-video` | Roadmap / SEO |

**ASMR — positioning:** AI ASMR generator, ASMR music and sound creation for relaxation/sleep content creators.  
**Cartoon — positioning:** AI cartoon video creator for punchy social and explainer-style animation.

---

### Coming soon (shown on `/new` style picker)

| ID | Label | Tagline | Intended use |
|----|-------|---------|--------------|
| `whiteboard` | Whiteboard | Hand-drawn explainer style | Tutorials, step-by-step walkthroughs, business breakdowns |
| `comic` | Comic | Panel-based storytelling | Social launches, dramatic narrative sequences |
| `doodle` | Doodle | Casual sketch energy | Short social clips, quick ideas, brand personality |

Do not promise ship dates in copy unless product confirms.

---

## Pricing & plans (source of truth)

From billing config — **override any placeholder landing pricing** with these values:

| Plan | Price | Credits | Notes |
|------|-------|---------|--------|
| **Free** | $0/mo | 10/mo | Watermarked exports, community support |
| **Starter** | $9/mo | 200/mo | No watermark, standard models (highlight plan) |
| **Pro** | $29/mo | 1000/mo | All models, priority queue, metered overage |
| **100 Credit Pack** | $5 one-time | 100 | Top-up |
| **500 Credit Pack** | $20 one-time | 500 | Top-up |

**Messaging:** Start free → upgrade when volume or quality (watermark, models, queue) matters.

---

## Feature list (public / schema.org)

Use for meta descriptions, comparison pages, and app store–style lists:

- AI stickman explainer video generation  
- AI lofi music & long-hour background music  
- AI ASMR song and sound creation  
- AI cartoon video creation  
- Text-to-video AI  
- AI voiceover generation  

---

## SEO & metadata cheat sheet

**Default title:** `Reelify — AI Video Generator for Creators`  
**Default description:** Create explainer videos, lofi music, ASMR songs, and cartoon videos with AI in seconds. Reelify is the all-in-one AI content creation platform built for YouTubers, educators, and digital creators.

**Homepage title variant:** `Reelify — AI Video Generator for Creators | Explainers, Lofi, ASMR & Cartoon`

Import helpers from `@/shared/lib/seo`:

- `SEO.siteName`, `SEO.siteUrl`, `SEO.defaults`
- `flatKeywords('core', 'stickman', …)` for page-level `keywords`
- `buildTitle()`, `buildCanonical()`

---

## Content guidelines for feature teams

When adding UI copy, docs, or prompts:

1. **Brand name:** Always **Reelify** in user-facing strings (not “StickStory” or repo name).
2. **Audience:** Speak to creators who publish (YouTube, social, courses), not enterprise IT.
3. **Format first:** Lead with what they get (e.g. “60s stickman explainer”) not model names.
4. **Honest status:** If a format is `coming_soon`, say so; don’t link `/new` cards to dead routes.
5. **Pricing:** Link to `/pricing` and use plan table above.
6. **Cross-link:** Feature-specific implementation docs live under `docs/lofi/`, `docs/lofi-stock/`; this file is **why/who/what**, those are **how**.

### Example microcopy patterns

| Context | Example |
|---------|---------|
| CTA primary | Start creating · Try free · Generate your first video |
| CTA secondary | See pricing · Explore formats |
| Empty state | Pick a style on New Video to begin your first story. |
| Error (credits) | Not enough credits — upgrade or buy a pack to continue. |

---

## Related documentation

| Doc | Purpose |
|-----|---------|
| [`shared/lib/seo.ts`](../shared/lib/seo.ts) | Keywords, URLs, OG defaults |
| [`features/billing/server/plans.ts`](../features/billing/server/plans.ts) | Plans, credits, Polar product IDs |
| [`docs/lofi/`](lofi/) | Lofi pipeline, orchestration, credits |
| [`docs/lofi-stock/`](lofi-stock/) | Stock-audio variant / licensing |
| [`app/new/page.tsx`](../app/new/page.tsx) | Category picker copy & availability |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-02 | Initial business context doc from site metadata, SEO, layout schema, and product routes |
