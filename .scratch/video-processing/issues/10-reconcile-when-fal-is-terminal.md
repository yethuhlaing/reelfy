# Reconcile when fal is already terminal

Type: grilling
Status: resolved
Blocked by: 01, 06

## Question

If fal has a terminal result and our webhook missed it, how does our system converge?

Decide when we ask fal (on read, on progress tick, both), what we persist, and what the UI does. Export and brainrot already reconcile; animate and lofi do not. The contract should be one behavior, not two lucky paths.

## Answer

Synthesized in [Video processing kernel](../spec.md): reconcile on `get`, progress ticks, and in-flight list reads; download inside ~1h window.
