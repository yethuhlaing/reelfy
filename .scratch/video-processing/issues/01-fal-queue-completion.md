# What fal exposes after a queue request finishes

Type: research
Status: claimed

## Question

When we submitted a fal queue request (we have `providerRequestId` / endpoint) and our webhook never arrived, what can we still learn from fal itself?

Need, from fal’s own docs/API (not blog posts):

- How to read status and result of a queue request after the fact.
- Whether a completed request still returns the output URL, and for how long.
- Webhook retry / timeout behavior (including the 15s timeout our brainrot comments mention).
- Failure vs still-in-progress vs result-expired: how those look on the wire.

This unblocks the reconcile contract. Write findings as a Markdown asset under `.scratch/video-processing/research/` and link it from the answer.
