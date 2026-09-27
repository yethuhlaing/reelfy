# 05: Lofi Run unsticks when fal is already done

**What to build:** A user generating lofi can leave and come back. If fal already finished an asset or the final compose and the webhook missed, the next load (or a dropped stream that refetches) shows the video or a real failure — not generating/rendering forever. Cancel is visible in other tabs. Retry keeps ready assets.

**Blocked by:** 01 Stand up the Video processing kernel

**Status:** done

- [x] The lofi video is the Target; asset fal calls and final compose are Steps of one Run. Refresh still shows generating or rendering from the server.
- [x] Missed asset webhook: `get` reconciles the asset, fan-in proceeds, and the user is not stuck on generating with work already done on fal.
- [x] Missed render webhook: `get` reconciles compose and the MP4 appears (or a retryable failure if the queue result is gone).
- [x] SSE error/timeout refetches the Run; indefinite loading is illegal when `get` returns terminal. Phases match the current Step (generating assets / rendering). `gating` is not a Run state.
- [x] Double-submit on the same in-flight video does not start a second compose. A new Generate on the form may still create a new video (new Target).
- [x] Cancel marks aborted, attempts fal cancel, releases unused credits, publishes so other tabs do not stay generating, and ignores late fal success. Cancel is only offered while in flight.
- [x] Retry render from `failed` reuses ready assets; a failed asset Step can be retried, or Retry explains why it cannot. `aborted` is not retryable.
- [x] Webhook acks quickly and is idempotent; enqueue failure leaves the Run `failed`, not running without provider ids.
- [x] Kernel tests include an asset Step completing unsticks generating, and cancel then late compose ignored.
