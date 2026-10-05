# 01: Stand up the Video processing kernel

**What to build:** A kernel that owns a Run’s lifecycle in tests, before any product UI changes. An agent (or a developer) can run the kernel tests and see: start a Run, drop every client, `get` the Target, and the Run is still there; a missed webhook plus fal `COMPLETED` becomes a video URL on the sink; a second `start` on the same Target does not enqueue again.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Test runner exists and runs in-process kernel tests only (no E2E stack).
- [x] Kernel operations `start`, `get`, `cancel`, `retry`, `onWebhook`, and `progress` work against fake fal, fake store, fake credits, and fake result sink.
- [x] `get` on an in-flight Run reconciles: `COMPLETED` without error applies the result; `COMPLETED` with error fails the Step; `IN_QUEUE` / `IN_PROGRESS` stays running.
- [x] Second `start` on an in-flight Target returns the same Run and does not call fal submit or reserve credits again.
- [x] `cancel` then a late webhook success does not complete the Run.
- [x] Result `NOT_FOUND` after the queue-result window fails the Run as retryable.
- [x] Duplicate `onWebhook` for an already-terminal Step is a no-op.
- [x] Postgres can store a Run (expand beside today’s Redis jobs). No live animate/export/brainrot/lofi path is required to read it yet.
- [x] Chat `runs` / `creditHolds` are untouched.
