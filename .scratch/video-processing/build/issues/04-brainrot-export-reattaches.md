# 04: Brainrot export reattaches without a job id

**What to build:** A user opens a brainrot project from the dashboard mid-export with no job id in the URL and sees progress or the finished reel. The overlay cannot spin forever on a dead socket. A second export joins the in-flight Run. Failed retry is this project, not “start a new reel.”

**Blocked by:** 01 Stand up the Video processing kernel

**Status:** ready-for-agent

- [ ] Project page and dashboard card work from the project Target alone; `?jobId=` is not required to reattach or reconcile.
- [ ] Compose then subtitle are two Steps of one Run; the user never sees a finished reel missing captions because compose completed, or a spinner stuck between Steps.
- [ ] Missed webhook: next load finalizes if fal is terminal (including the existing dashboard heal, now via the kernel).
- [ ] Second export while `running` returns the existing Run and does not charge again or orphan the first fal request.
- [ ] Progress stream reconnects or re-gets on `reconnect` / error; overlay clears when the Run is `completed` or `failed`.
- [ ] Failed CTA retries this project on the same Run; if compose already has a stored video, only subtitle runs again.
- [ ] Explicit cancel marks aborted, attempts fal cancel, releases unused credits, ignores late success.
- [ ] Webhook acks quickly (`after` for heavy work) and is idempotent across both Steps.
- [ ] Kernel tests include subtitle-only retry and missed webhook on each Step.
