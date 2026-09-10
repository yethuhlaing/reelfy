# Where a Run is persisted

Type: grilling
Status: open
Blocked by: 03

## Question

What is the source of truth for a Run, such that refresh, another device, and a shareable URL can all reattach?

Today: Redis job records (24h TTL) for animate/export, Postgres `render_job_id` for brainrot, Postgres `lofi_videos.status` for lofi. Decide what must live in Postgres vs what Redis (or SSE) may keep as progress fan-out. No new infra.
