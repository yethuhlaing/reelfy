# Shared kernel interface

Type: grilling
Status: resolved
Blocked by: 04, 05, 06, 07, 08, 09, 10, 11

## Question

What is the kernel’s interface — the operations every path must go through (create/attach, enqueue Step, reconcile, cancel, retry, read progress)?

Specify the interface and what each path must persist. Do not design a new queue. Four adapters remain; lifecycle is not reimplemented per path. This is the spec’s spine.

## Answer

Synthesized in [Video processing kernel](../spec.md): `start` / `get` / `cancel` / `retry` / `onWebhook` / `progress`; fal queue, Run store, and result sink are ports.
