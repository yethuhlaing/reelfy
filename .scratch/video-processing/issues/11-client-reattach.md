# How the client reattaches to a Run

Type: grilling
Status: open
Blocked by: 03, 06, 09

## Question

On page load (refresh, new device, shared URL, no `jobId` in memory), how does the client find and resume the in-flight or just-finished Run?

Today animate stores `pendingJobId` only in component state. The answer should make that illegal under the contract.
