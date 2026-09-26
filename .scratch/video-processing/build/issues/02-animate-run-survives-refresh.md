# 02: Animate Run survives refresh and missed webhooks

**What to build:** A user animates a scene, refreshes or opens the story elsewhere, and still sees animating — or the clip, if fal already finished. Clicking Animate again does not start a second fal request. Retry is still there after reload. Stop cancels; refresh does not.

**Blocked by:** 01 Stand up the Video processing kernel

**Status:** done

- [x] Story GET hydrates the in-flight or failed animate Run on each scene; the workspace does not depend on tab-only pending ids.
- [x] Reload mid-animate shows the scene as animating; the original fal request is still the one in flight.
- [x] If fal completed and the webhook missed, the next load (or poll) shows the scene video.
- [x] Second Animate on an in-flight scene returns the existing Run (no second fal submit, no second credit reserve).
- [x] After a failed animate, reload still offers Retry on that scene; Retry replays the failed Step on the same Run.
- [x] Explicit cancel marks the Run aborted, attempts fal cancel, releases unused credits, and ignores a late fal success. Refresh / navigation does not cancel.
- [x] Re-animate is allowed once the previous Run is terminal.
- [x] Animate webhook acks quickly and is idempotent; enqueue failure leaves the Run `failed` (retryable), not `running` without provider ids.
- [x] Kernel tests for this Target kind stay green (reattach, missed webhook, double start, cancel then late result).
