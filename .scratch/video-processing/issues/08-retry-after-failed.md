# Retry after failed

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

After a Run is `failed`, what does retry do?

New Run vs same Run; which Steps replay vs reuse (e.g. lofi assets already `ready`); and how credits apply given the credit rules already decided. Lofi already has `retry-render` — the contract should either generalize that or say where paths may differ.

## Answer

Synthesized in [Video processing kernel](../spec.md): same Run from `failed`; skip completed Steps; lofi retry-render kept; aborted is not retryable.
