# Progress contract

Type: grilling
Status: resolved
Blocked by: 05

## Question

What must the client be able to show, and what must happen when the progress connection drops?

Transport is free (SSE or poll) as long as refresh reattaches. Spec the phases the UI can display, that a dropped connection must reconnect or fall back to reattach, and that “loading forever with no terminal signal” is not an allowed state when the Run is terminal on the server (or on fal, once reconcile exists).

## Answer

Synthesized in [Video processing kernel](../spec.md): phase = current Step; drop → reconnect or `get(Target)`; no client false-fail while server running.
