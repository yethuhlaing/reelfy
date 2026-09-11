# 03: Story export Run survives refresh and missed webhooks

**What to build:** A user starts export, refreshes, and still sees composing. A dropped stream is not a failed export. If fal already finished, the Video tab shows the file without the modal having stayed open. Second Start joins the in-flight Run. Retry actually re-runs compose. Cancel is a real stop.

**Blocked by:** 01 Stand up the Video processing kernel

**Status:** ready-for-agent

- [ ] Story GET hydrates the in-flight or failed export Run; the pill/modal do not depend on a tab-only job id.
- [ ] Reload mid-export shows composing; page load reconciles even if no EventSource is connected.
- [ ] If fal completed and the webhook missed, the next load shows the composed video on the story.
- [ ] Second Start Export on an in-flight story returns the existing Run (no second compose, no second credit reserve).
- [ ] A dropped progress stream reconnects or re-gets; it must not mark the Run failed while the server still has it running. The 20-minute client timeout must not lie.
- [ ] Retry on a failed export re-runs compose for this story (does not only reset the form). Failure is visible after reload.
- [ ] Explicit cancel marks the Run aborted, attempts fal cancel, releases unused credits, and clears the pill/modal. Refresh does not cancel.
- [ ] Export webhook acks quickly and is idempotent.
- [ ] Kernel tests for this Target kind stay green.
