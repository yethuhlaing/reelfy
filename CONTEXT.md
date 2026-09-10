# Reelfyme

Reelfyme produces short videos for a user. This glossary is the language for that work, not a spec.

## Language

**Video processing**:
The durable lifecycle of a user-facing action that produces video via fal.
_Avoid_: Rendering pipeline, video pipeline, video job

**Run**:
One Video processing action, either in flight or terminal.
_Avoid_: Job (as the user-facing word), render request

**Step**:
An inner fal call that belongs to a Run, not a separate user-facing action.
_Avoid_: Sub-job, nested pipeline
