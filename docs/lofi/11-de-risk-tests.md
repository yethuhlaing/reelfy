# 11 — De-Risk Tests (Do These First)

Three tests to run BEFORE building any UI or DB schema. They de-risk the two highest-uncertainty parts of the design.

If any test fails, the plan needs revision before commit-heavy work begins.

## Test 1 — fal-ai/ffmpeg-api with 30 inputs + filter_complex

**Goal:** confirm fal compose can ingest 30+ remote URLs and run a non-trivial filter graph producing a 1hr MP4.

**Setup:**
1. Manually generate 30 short MP3 loops via fal minimax (one-off ~$3 spend)
2. Create one PNG via fal flux-schnell
3. Pick a freesound rain MP3 (~5min)
4. Hand-write the arrangement plan JSON for these inputs
5. Compile to filter_complex
6. POST to fal-ai/ffmpeg-api/compose synchronously (use `fal.subscribe`)

**Pass criteria:**
- Job accepted (no input limit error)
- Job completes within fal's timeout (typically 60min compose ceiling)
- Output is a valid 1hr MP4, plays in VLC/QuickTime
- Audio crossfades audible-but-not-jarring at loop boundaries
- File size < 500MB

**Fail mitigations:**
- If input cap hit: chunked render strategy ([05-arrangement-engine.md](05-arrangement-engine.md))
- If filter_complex rejected: switch to multi-pass (build intermediate audio, then mux)
- If output too long: confirm 30min cap → adjust target to 30min, batch 4× for 2hr post-MVP

**Where to put test:** `scripts/test-fal-compose.ts` (tsx-runnable, takes ~$5 to run end-to-end). Document outcome in `docs/lofi/12-test-results.md` after run.

## Test 2 — Loop seamlessness per music model

**Goal:** confirm 12s crossfade hides seams adequately. If a particular model's loops have abrupt energy changes, may need 16-20s xfade or post-trim to bar boundaries.

**Setup:**
1. Generate 3 loops each from minimax, stable-audio, cassette (vibe: "chill lofi piano with vinyl crackle")
2. Concatenate each pair with 8s, 12s, 16s crossfade locally using ffmpeg
3. Listen + subjective rating (1-5) for smoothness
4. Pick winning crossfade duration per model

**Pass criteria:**
- ≥1 model produces loops where 12s xfade rated ≥4 by ear

**Fail mitigation:**
- If all models score <3 even at 16s: add beat-detection pre-trim using aubio (run on server before storing loop URL)
- Or: pre-process each loop with ffmpeg `afade=in:d=2,afade=out:d=2,acrossfade` self-loop trick

**Cost:** ~$5 in fal calls.

## Test 3 — Vercel Blob upload from fal URL at 300MB+

**Goal:** confirm `put()` flow works for the final MP4 size (~300-500MB at 1-2hr 1080p stillimage).

**Setup:**
1. Use the MP4 from Test 1
2. Server-side: `fetch(falUrl)` → stream into `@vercel/blob` `put()`
3. Confirm uploaded URL plays back

**Pass criteria:**
- Upload completes within Vercel function timeout (Fluid Compute 300s default)
- Resulting URL public, content-type=video/mp4
- Streams in browser `<video>` tag without re-download

**Fail mitigation:**
- If timeout: use `@vercel/blob` multipart upload (it's the default for large; verify behavior)
- If chunking needed: have the render webhook write to blob via direct fal→blob proxy (avoid double download)

## Test 4 (optional) — Gemini prompt expansion quality

**Goal:** sanity check that gemini produces useful, varied prompts for a given vibe.

**Setup:**
1. POST sketched prompt to gemini (no DB) with vibe "rainy tokyo cafe at midnight", musicLoopCount=20, visualMode='multi-image', visualAssetCount=3
2. Inspect output by eye

**Pass criteria:**
- Music prompts are varied (different instruments / moods, not just rewordings)
- Visual prompts feel like the same scene from different angles
- Output is parseable JSON

**Fail mitigation:**
- Iterate on system prompt
- Switch model (gemini 2.5 vs 2.0)
- Add few-shot examples in system prompt

## Order

1. Run Test 1 first (highest risk, blocks render strategy)
2. Run Test 2 in parallel (independent)
3. Test 3 after Test 1 produces an MP4
4. Test 4 last (lowest risk, easy to iterate on)

## Total de-risk budget

Approximate fal spend: $10-15. Time: 1-2 days of focused work. Done before any DB migration or component scaffolding.
