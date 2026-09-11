# Cancel semantics

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

What does explicit cancel mean for a Run and its in-flight fal Steps?

Refresh is not cancel. Decide whether we attempt to cancel the fal request, mark the Run aborted and ignore a late result, or both. Tie the answer to the credit rules already decided.

## Answer

Synthesized in [Video processing kernel](../spec.md): mark aborted, best-effort fal cancel, ignore late success, release unused credits.
