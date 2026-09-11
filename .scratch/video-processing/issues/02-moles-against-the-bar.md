# Where each path fails the robustness bar today

Type: research
Status: resolved

## Question

Against the locked bar (reattach on refresh/device/URL, explicit cancel only, no double-enqueue, retry after failed, progress contract), where do these four paths fail *today*?

Paths: story animate, story export, brainrot export, lofi generate (including asset Steps).

Primary source is this repo’s code, not memory. For each hole: the file that causes it, the user-visible symptom, and which bar item it violates.

This is the moles inventory the state-machine and persistence tickets will grill against. Write findings as a Markdown asset under `.scratch/video-processing/research/` and link it from the answer.

## Answer

Findings: [moles-against-the-bar](../research/moles-against-the-bar.md). The spec’s implementation order follows this inventory.
