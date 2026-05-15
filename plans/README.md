# Implementation Plans

Three sequenced PRs delivering: persistence, thumbnail generator, video compose pipeline.

| PR | File | Adds | Depends on |
|----|------|------|------------|
| 1  | [PR1-persistence-and-voiceover-blob.md](./PR1-persistence-and-voiceover-blob.md) | localStorage recent-5 list, voiceovers stored in Vercel Blob, refresh-resume | — |
| 2  | [PR2-thumbnail-generator.md](./PR2-thumbnail-generator.md) | Hero "cover" image per story, lazy generate button, extends planStory schema | PR 1 |
| 3  | [PR3-video-compose-pipeline.md](./PR3-video-compose-pipeline.md) | "Render Video" → MP4 with karaoke captions, Ken Burns motion, intro card | PR 1 + PR 2 |

## Locked design decisions (from /grill-me)

| # | Decision | Choice |
|---|---|---|
| Persistence scope | local-only (localStorage) |
| Voiceover storage | lazy upload to Vercel Blob via `/api/voiceover` |
| Recent stories | list of 5, left-panel below StoryInput |
| Video composition | server-side ffmpeg (`@ffmpeg-installer`) |
| Scene pacing | voiceover duration + 0.4s tail |
| Transitions | hard cuts |
| Motion in final video | Ken Burns zoompan per clip (1.0 → 1.05) |
| Output spec | 1920×1080, 30fps, H.264 + AAC, MP4 |
| Background music | none (MVP) |
| Captions | hard-burned karaoke, ASS via libass |
| Caption style | white + black outline + yellow active word, configurable constant |
| Whisper provider | Groq `whisper-large-v3` |
| Whisper timing | lazy in `/api/compose` |
| ffmpeg concurrency | serial clip encode; parallel Whisper |
| Failure handling | retry transient 2x, hard-fail permanent |
| Thumbnail generation | lazy on-demand button |
| Thumbnail aesthetic | hybrid comic + baked-in title typography |
| Thumbnail prompt | embedded in `planStory` JSON output (`thumbnailPrompt` field) |
| Thumbnail UI | empty slot above scene grid with Generate CTA |
| Intro card | auto-gen at compose, 2.5s, silent, slight zoom-in |
| Intro/outro extras | no end card for MVP |
