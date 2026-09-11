# Canonical Run states and steps

Type: grilling
Status: resolved
Blocked by: 02, 03

## Question

What states does a Run have, and what Steps can it contain?

Must map onto today’s four paths without inventing a second status vocabulary per product: lofi `generating` → `rendering`, brainrot compose → subtitle, animate’s single fal call, story export’s compose. Terminal states must include completed, failed, and aborted (explicit cancel).

## Answer

Synthesized in [Video processing kernel](../spec.md): `pending|running|completed|failed|aborted`; product statuses are projections; Steps carry fal work.
