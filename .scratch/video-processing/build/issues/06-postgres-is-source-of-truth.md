# 06: Stop treating Redis jobs as the source of truth

**What to build:** Animate, export, and brainrot survive a lost Redis record. The user who only has the story/project URL still reattaches via `get(Target)`. Redis may still hint progress; it must not be the only place the Run lives.

**Blocked by:** 02 Animate Run survives refresh and missed webhooks, 03 Story export Run survives refresh and missed webhooks, 04 Brainrot export reattaches without a job id

**Status:** ready-for-agent

- [ ] In-flight animate, export, and brainrot Runs are readable from Postgres after the Redis job TTL would have expired (or after the Redis key is missing).
- [ ] A client that held only a Redis job id and loses it recovers by loading the Target (story/scene/project).
- [ ] Redis may still fan out progress; deleting or expiring a job key does not mark a live Run failed and does not prevent reconcile.
- [ ] No live path treats a 24h Redis job as the record of truth for Video processing.
- [ ] Lofi is unchanged except that it already used Postgres; this ticket must not regress ticket 05.
