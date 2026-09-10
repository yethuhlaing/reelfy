# What fal still exposes after a missed webhook

Type: research
Date: 2026-09-10
Question: When we submitted a fal queue request (we have `providerRequestId` / `providerEndpoint`) and our webhook never arrived, what can we still learn from fal itself?

Sources are official fal docs, first-party model pages, and first-party `@fal-ai/client` source. Repo paths below are primary for *our* field mapping only.

---

## Short answer

A missed webhook does not lose the job on fal’s side. While the **queue result is still retained**, we can:

1. `GET` status by `(endpoint, request_id)` — same pair we already store as `providerEndpoint` + `providerRequestId`.
2. If status is `COMPLETED`, `GET` the model output (including the video URL) and download it.
3. Inspect fal’s Webhooks dashboard for the last delivery attempt.

Official queue statuses are only `IN_QUEUE` | `IN_PROGRESS` | `COMPLETED`. Failures show up as `COMPLETED` plus `error` / `error_type` on the status object, or as webhook `status: "ERROR"` — not as a separate `FAILED` queue status.

The 15s webhook timeout in our brainrot comments is real (initial attempt). Retries use 120s and keep going until the **stored queue result expires** (about 1 hour after completion, or about 6 minutes if the JSON result is ≥ 10 KB), up to 31 attempts.

---

## How this repo already talks to fal

Configured client: `shared/lib/providers/fal.ts` exports `fal` from `@fal-ai/client`, credentials from `FAL_KEY`.

Submit + persist:

| Our field | What we store | Source in this repo |
| --- | --- | --- |
| `providerRequestId` | `submitted.request_id` from `fal.queue.submit(...)` | `app/api/export/route.ts`, `app/api/compose/route.ts`, `app/api/brainrot/export/route.ts` via `markRunning` |
| `providerEndpoint` | The model id string passed as the first argument to `fal.queue.submit` | Same routes; constants `fal-ai/ffmpeg-api/compose` and `fal-ai/workflow-utilities/auto-subtitle` |

`Job` shape: `shared/lib/jobs/types.ts` (`providerRequestId?`, `providerEndpoint?`). Writer: `markRunning` / `updateJobProvider` in `shared/lib/jobs/store.ts`.

Reconcile (already implemented, webhook-independent):

- Stories: `reconcileExportFromFal` in `features/stories/server/export-finalize.ts` — `fal.queue.status(job.providerEndpoint, { requestId: job.providerRequestId })`, then on `COMPLETED` `fal.queue.result(...)` and `data.video_url ?? data.video?.url`.
- Brainrot: `reconcileBrainrotExportFromFal` in `features/brainrot/server/export-finalize.ts` — same pair of calls. Compose phase then submits subtitles and **replaces** `providerRequestId` / `providerEndpoint` with the subtitle request (`updateJobProvider(..., SUBTITLE_MODEL_ID)`).

That mapping matches fal’s JS API: first arg is `endpointId`, options include `requestId`.

- https://fal.ai/docs/documentation/model-apis/inference/queue — JS: `fal.queue.status("fal-ai/flux/schnell", { requestId })` and `fal.queue.result(..., { requestId })`.
- https://fal.ai/docs/api-reference/client-libraries/javascript/queue — `status(endpointId, options)`, `result(endpointId, options)`, `cancel(endpointId, options)`.

---

## 1. Read status and result after the fact

### JavaScript client (what we use)

```js
const status = await fal.queue.status(endpointId, { requestId, logs: true })
const result = await fal.queue.result(endpointId, { requestId })
// result = { data: <model output>, requestId }
```

- https://fal.ai/docs/documentation/development/calling-your-endpoints — “Check status” / “Get result when ready” with exactly those calls.
- https://fal.ai/docs/documentation/model-apis/inference/queue — “Store the `request_id` if you need to check status or retrieve results later, even from a different process.” JS should call `result()` **after** status is `COMPLETED`.
- https://fal.ai/docs/api-reference/client-libraries/javascript/types.common — `Result = { data: T; requestId: string }`.

First-party client source (`@fal-ai/client` queue client) builds these REST URLs (subdomain `queue`):

| Method | HTTP | Path |
| --- | --- | --- |
| `fal.queue.status` | `GET` | `/requests/{requestId}/status?logs=0\|1` |
| `fal.queue.result` | `GET` | `/requests/{requestId}` |
| `fal.queue.cancel` | `PUT` | `/requests/{requestId}/cancel` |
| `fal.queue.streamStatus` | `GET` | `/requests/{requestId}/status/stream` |
| `fal.queue.submit` + `webhookUrl` | `POST` | `?fal_webhook=<url>` |

Source: https://cdn.jsdelivr.net/npm/@fal-ai/client@1.8.3/src/queue.js (published `@fal-ai/client` source; `status`/`result`/`cancel` `path:` values above).

Auth header on all of these: `Authorization: Key $FAL_KEY`.

- https://fal.ai/docs/documentation/model-apis/inference/queue — every cURL example uses that header.

Backup host if `queue.fal.run` is unreachable: `queue.falrun.com` (same path and key).

- https://fal.ai/docs/documentation/model-apis/inference/reliability — table: `queue.fal.run` → `queue.falrun.com` for “Queue submission, status, results, and cancellation.”

### REST equivalents (official)

Submit response includes ready-made URLs (keep `request_id` even if we discard the URLs):

```json
{
  "request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b",
  "response_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/764cabcf.../response",
  "status_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/764cabcf.../status",
  "cancel_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/764cabcf.../cancel",
  "queue_position": 0
}
```

- https://fal.ai/docs/documentation/model-apis/inference/queue — “The submit response includes the `request_id` and convenience URLs…”

Documented GET-by-id:

```http
GET https://queue.fal.run/{owner}/{alias}/requests/{request_id}/status?logs=1
GET https://queue.fal.run/{owner}/{alias}/requests/{request_id}
GET https://queue.fal.run/{owner}/{alias}/requests/{request_id}/status/stream?logs=1
PUT https://queue.fal.run/{owner}/{alias}/requests/{request_id}/cancel
```

- https://fal.ai/docs/documentation/model-apis/inference/queue — cURL blocks under “Check Status”, “Get the Result”, “Stream Status Updates”, “Cancel a Request”.

Note: submit’s `response_url` ends in `/response`; the documented result cURL and the JS client both use `/requests/{id}` **without** `/response`. Treat those as the same result resource; we have not found an official statement that the two paths differ.

Webhook submit (REST) uses query param, not a header:

```http
POST https://queue.fal.run/{endpoint}?fal_webhook=https://...
```

- https://fal.ai/docs/documentation/model-apis/inference/webhooks — cURL example.

There is **no** official “GET by request_id alone” that omits the endpoint. Status and result are always `/{endpoint}/requests/{request_id}/...`. That is why we must persist `providerEndpoint` next to `providerRequestId`.

### Official OpenAPI

https://api.fal.ai/v1/openapi.json is the **Platform API** (admin/analytics), not the queue inference API.

- https://fal.ai/docs/api-reference/platform-apis/openapi-schema — “Base URL: `https://api.fal.ai/v1`”, “Authentication: API Key (Admin keys required).”

The queue contract used here is the inference/queue docs + `@fal-ai/client`, not that OpenAPI file. Do not treat third-party scraped queue OpenAPI specs as first-party.

---

## 2. Completed request still returns the output URL — and for how long

Yes. After `COMPLETED`, `fal.queue.result` / `GET .../requests/{id}` returns the **model-specific JSON**, which includes media URLs.

- https://fal.ai/docs/documentation/model-apis/inference/queue — “Retrieve the final output once the request is complete.” Example image result has `images[].url` on `https://v3.fal.media/...`. “Video generation models return a `video` object.” “All media URLs in responses (`https://v3.fal.media/...`) are publicly accessible and subject to your media expiration settings. Download files you need to keep before they expire.”

Our endpoints (first-party model pages):

**`fal-ai/ffmpeg-api/compose`** (story export/compose, brainrot compose, lofi render):

```json
{ "video_url": "", "thumbnail_url": "" }
```

- https://fal.ai/models/fal-ai/ffmpeg-api/compose/llms.txt — Output Schema: `video_url` (required), `thumbnail_url` (required).

**`fal-ai/workflow-utilities/auto-subtitle`** (brainrot subtitle phase):

```json
{
  "video": {
    "content_type": "video/mp4",
    "url": "https://v3b.fal.media/files/..."
  },
  "transcription": ""
}
```

- https://fal.ai/models/fal-ai/workflow-utilities/auto-subtitle/llms.txt — Output Schema: `video` is a File with `url`.

That is why reconcile already does `data.video_url ?? data.video?.url`.

### Three different clocks (do not collapse them)

| What | Default retention | Control | Source |
| --- | --- | --- | --- |
| **Queue result blob** used by `GET .../requests/{id}` and webhook retries | About **1 hour** after the request completes, or about **6 minutes** if the JSON result is **≥ 10 KB** | Implicit; shorter if `X-Fal-Store-IO: 0` or result **> 1 MB** | Webhooks page (below) |
| **Dashboard JSON I/O** (request history) | **30 days** | `X-Fal-Store-IO: 0` disables; Platform delete API | Common parameters + media-expiration |
| **CDN file** behind `video_url` / `video.url` | Account setting; **forever and public** if not configured | `X-Fal-Object-Lifecycle-Preference` | Common parameters + queue “Get the Result” callout |

Citations:

- https://fal.ai/docs/documentation/model-apis/inference/webhooks — Retry policy: retries continue “until the stored result expires — about 1 hour after the request completes, or about 6 minutes for results of 10 KB or more”. Fallback: “If all delivery attempts fail, you can usually still retrieve the result from the queue while it is retained — results larger than 1 MB, and results for requests with payload storage disabled, are only available until the stored result expires.”
- https://fal.ai/docs/documentation/model-apis/common-parameters — `X-Fal-Store-IO` default `"1"` (stored **30 days**); `"0"` disables. CDN files still exist subject to media expiration. `X-Fal-Object-Lifecycle-Preference` default: “Your account setting (forever and publicly readable if not configured).”
- https://fal.ai/docs/documentation/model-apis/media-expiration — Generated media vs request payloads are separate. Expired CDN files “are permanently deleted and cannot be recovered.”
- https://fal.ai/docs/documentation/model-apis/inference/payloads — `X-Fal-Store-IO: 0` “just avoids storage of the payloads in the platform itself”; CDN files from processing remain.

Implication for later tickets: a compose/subtitle **JSON** is typically a few hundred bytes (URL + thumbnail), so the queue-result window is the **~1 hour** figure, not the 6-minute ≥10 KB rule — unless fal counts something larger than the public schema. We do **not** set `X-Fal-Store-IO` today. After that hour, `result()` may fail even if the CDN URL would still 200. Conversely, a stale CDN URL can 404 while the JSON is still retrievable. Reconcile must **download and rehost** (we already do this into R2) inside the queue-result window.

Official docs do **not** document a distinct `EXPIRED` status string. After retention, expect a failed GET (cancel docs show `404` + `{"status":"NOT_FOUND"}` for an unknown id — that is the closest first-party 404 shape, but it is specified for **cancel**, not proven for expired result).

---

## 3. Webhook retry, timeout, delivery guarantees

### 15s timeout — verified

Our comment in `app/api/webhooks/fal/brainrot/export/[jobId]/route.ts` (“fal's webhook timeout is 15s”) matches official docs **for the first attempt only**.

- https://fal.ai/docs/documentation/model-apis/inference/webhooks — “Your endpoint must respond with a `2xx` status code to acknowledge the delivery. The initial delivery attempt has a **15-second timeout**; **retried deliveries have a 120-second timeout**.”

Story export webhook (`app/api/webhooks/fal/story/export/[jobId]/route.ts`) still `await finalizeExport` (download + R2) before returning `ok`. That can exceed 15s and look like a failed delivery even when we succeeded — fal will retry; handlers must stay idempotent (they already no-op on `completed`/`failed`).

### Retry / guarantees

From the same Webhooks page:

- Retry when: timeout, network error, or HTTP `4xx`/`5xx`.
- Backoff: “increasing backoff until the stored result expires” (1 hour / 6 minutes as above), **maximum 31 retries**.
- Idempotency: “tolerate repeat deliveries for the same `request_id`.”
- **Not** retried (permanent fail): HTTP `3xx` (redirects are **not** followed — `http→https` and trailing-slash redirects count); URLs that resolve to private / loopback / internal IPs (dropped **before** any request); that includes `localhost` and hostnames whose public DNS points at `10.x` etc.
- Hostname that **fails to resolve**: treated as network error → **retried**.
- After all attempts fail: still `GET` the queue result while retained (with the 1 MB / store-IO caveats above). Latest attempt is visible in the Webhooks dashboard (status code may be blank on network errors).

Webhook body `status` is **`OK` or `ERROR`**, not the queue `COMPLETED` enum.

- https://fal.ai/docs/documentation/model-apis/inference/queue — “The webhook `status` is `"OK"` for successful responses (HTTP 200) or `"ERROR"` for failures -- this is different from the queue status values (`IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`).”
- https://fal.ai/docs/documentation/model-apis/inference/webhooks — success example `"status": "OK"` + `payload`; error example `"status": "ERROR"` + `error` + `payload`.
- https://fal.ai/docs/api-reference/client-libraries/javascript/types.common — `WebHookResponse` union: `status: "OK" | "ERROR"`.

There is **no** at-most-once guarantee. Delivery is at-least-once until ack or expiry. There is **no** guarantee the webhook arrives at all (local tunnel, 3xx, private IP, expiry). Queue GET is the documented backstop.

IP allowlist (if needed later): `GET https://api.fal.ai/v1/meta` → `webhook_ip_ranges`.

- https://fal.ai/docs/documentation/model-apis/inference/webhooks — “Webhook IP Ranges.”

Signature headers (we already verify): `X-Fal-Webhook-Request-Id`, `X-Fal-Webhook-User-Id`, `X-Fal-Webhook-Timestamp`, `X-Fal-Webhook-Signature`. JWKS: `https://rest.fal.ai/.well-known/jwks.json`. Timestamp leeway ±5 minutes.

- https://fal.ai/docs/documentation/model-apis/inference/webhooks — “Verifying Your Webhook.”

Repo note (not a fal claim): `shared/lib/jobs/verify-fal.ts` fetches JWKS from `https://rest.alpha.fal.ai/.well-known/jwks.json`, not the `rest.fal.ai` URL in current docs.

---

## 4. How states look on the wire

### Queue status (`GET .../status` / `fal.queue.status`)

Official lifecycle is **three** values only:

| `status` | Meaning | Extra fields |
| --- | --- | --- |
| `IN_QUEUE` | Waiting for a runner | `queue_position`, `request_id`, `response_url` |
| `IN_PROGRESS` | Runner has the request | `logs?`, `request_id`, `response_url` |
| `COMPLETED` | Result stored (or sent to webhook) | `logs?`, `metrics.inference_time`, and **if failed**: `error`, `error_type` |

- https://fal.ai/docs/documentation/model-apis/inference/queue — “Request Lifecycle” table; JSON examples for all three; field table: “`error` — A human-readable error message, present only if the request failed (**only when `COMPLETED`**)”; “`error_type` — … present only if the request failed.”
- https://fal.ai/docs/api-reference/client-libraries/javascript/types.common — `QueueStatus = InQueue \| InProgress \| Completed`; `status` literals `"IN_QUEUE" \| "IN_PROGRESS" \| "COMPLETED"` only. First-party TS types do **not** include `FAILED` / `ERROR` / `CANCELED`.
- https://fal.ai/docs/documentation/model-apis/request-errors — Failed infra errors: `{ "detail": "...", "error_type": "request_timeout" }` and “The `error_type` is also available in **queue status responses for failed requests**.” Typical HTTP codes (504/503/502/499/400/500) apply to the **failed inference response**, not necessarily to the status GET.

**In-progress on the wire (status GET):** HTTP 200 + `"status":"IN_PROGRESS"` (or `IN_QUEUE`). Docs do not say status GET returns 202.

**Completed success:** HTTP 200 + `"status":"COMPLETED"` and **no** `error`. Then result GET returns the model JSON (compose: `video_url`; subtitle: `video.url`).

**Completed failure:** still `"status":"COMPLETED"` **with** `error` / `error_type`. This is the official failure shape for queue status. Webhook equivalent is `"status":"ERROR"`.

**Repo gap:** `reconcileExportFromFal` / `reconcileBrainrotExportFromFal` treat `status.status === 'ERROR' \|\| status.status === 'FAILED'` as terminal. Those strings are **not** in the official queue status enum. A failed job that lands as `COMPLETED` + `error` would currently take the success branch, call `result()`, and only then `markFailed` if result fetch throws or the URL is missing. Later tickets should key off `COMPLETED` + `error` / `error_type`, and treat webhook `ERROR` separately.

**Expired / unknown:** no `EXPIRED` status in official docs. Closest documented 404 body is cancel’s `{"status":"NOT_FOUND"}`.

**Streaming status:** SSE `text/event-stream`; each event is the same JSON as poll; connection stays open until `COMPLETED`.

- https://fal.ai/docs/documentation/model-apis/inference/queue — “Stream Status Updates.”

### Webhook POST body

Success:

```json
{
  "request_id": "...",
  "gateway_request_id": "...",
  "status": "OK",
  "payload": { "video_url": "...", "thumbnail_url": "..." }
}
```

Failure:

```json
{
  "request_id": "...",
  "gateway_request_id": "...",
  "status": "ERROR",
  "error": "Invalid status code: 422",
  "payload": { "detail": [ ... ] }
}
```

Non-JSON model output: `payload: null` + `payload_error` telling you to use the queue endpoint.

- https://fal.ai/docs/documentation/model-apis/inference/webhooks — “Successful result”, “Response errors”, “Payload errors.”
- https://fal.ai/docs/documentation/model-apis/inference/queue — `request_id` vs `gateway_request_id`: if fal retried the run, `gateway_request_id` is the last attempt; `request_id` is the id used in the queue API (the one we store).

### Result GET while still running

Official guidance: only fetch result after `COMPLETED`. The docs do **not** specify the HTTP status of an early result GET. Do not poll `result()` as a status substitute.

---

## 5. Canceling a queue request

Yes. Same `(endpoint, request_id)` pair.

```js
await fal.queue.cancel(endpointId, { requestId })
```

```http
PUT https://queue.fal.run/{endpoint}/requests/{request_id}/cancel
Authorization: Key $FAL_KEY
```

- https://fal.ai/docs/documentation/model-apis/inference/queue — “Cancel a Request.”
- https://fal.ai/docs/documentation/development/handle-cancellations — same PUT; JS `fal.queue.cancel`.
- https://fal.ai/docs/api-reference/client-libraries/javascript/queue — `cancel(endpointId, options): Promise<void>`.

Behavior by state:

| Current state | What fal does |
| --- | --- |
| `IN_QUEUE` | Removed immediately; never processed. |
| `IN_PROGRESS` | Cancellation **signal** to the runner. May still **complete** if the app has no cancel handler. Marketplace models (ffmpeg-api, auto-subtitle) are not documented as implementing cancel. |

Cancel HTTP responses:

| HTTP | JSON | Meaning |
| --- | --- | --- |
| `202` | `{"status":"CANCELLATION_REQUESTED"}` | Accepted; may still finish if already processing. |
| `400` | `{"status":"ALREADY_COMPLETED"}` | Finished before cancel arrived. |
| `404` | `{"status":"NOT_FOUND"}` | No request with that id. |

SDK: `cancel()` succeeds silently on 202; throws on 400/404.

- https://fal.ai/docs/documentation/model-apis/inference/queue — cancel table + “When using the SDK, `handler.cancel()` succeeds silently on `202` and raises an exception on `400` or `404`.”

Queue-based `submit()` / `subscribe()`: dropping our HTTP connection does **not** cancel; only an explicit cancel call does.

- https://fal.ai/docs/documentation/development/handle-cancellations — “This does not apply to queue-based requests (`submit()`, `subscribe()`), where the connection closes after submission and only an explicit cancel API call can stop the request.”

This repo does not call `fal.queue.cancel` today.

---

## 6. Related platform behavior (useful, not the reconcile API)

- Queue requests are not dropped for lack of runners; runner 503/504/connection errors retry up to **10** times.
  - https://fal.ai/docs/documentation/model-apis/inference/queue — “Key Guarantees.”
  - https://fal.ai/docs/documentation/model-apis/inference/reliability — retries on 503, 504, connection errors, 429; “up to 10 times.”
- `start_timeout` / `X-Fal-Request-Timeout` only caps time **before** a runner starts; once processing begins, the app’s `request_timeout` (default 3600s) applies.
  - https://fal.ai/docs/documentation/model-apis/inference/queue — `start_timeout` section.
- Client `timeout` on `subscribe()` stops **our** polling; the server request continues. Irrelevant to webhook+reconcile, but means “we gave up” ≠ “fal died.”
  - Same page, `client_timeout` / `timeout`.

---

## Gaps (official docs do not say)

- Exact HTTP status / JSON when `GET .../requests/{id}` is called **before** `COMPLETED`, or **after** the ~1h / ~6min queue-result TTL.
- A queue status named `FAILED`, `ERROR`, `CANCELED`, or `EXPIRED`.
- Whether marketplace compose/subtitle runners honor in-progress cancel.
- Whether dashboard 30-day I/O storage can be read back via `fal.queue.result` after the short queue-result TTL (docs describe those as different stores).
- First-party OpenAPI for `queue.fal.run` (Platform OpenAPI is a different API).

---

## What later tickets can depend on

1. Persist **both** `providerRequestId` (`request_id`) and `providerEndpoint` (model id). Status/result/cancel all require the pair.
2. After a missed webhook: `fal.queue.status` then, if `COMPLETED` and no `error`, `fal.queue.result` — already the reconcile shape.
3. Pull the video from `result.data.video_url` (compose) or `result.data.video.url` (auto-subtitle); download to our storage before CDN/queue TTLs matter.
4. Treat webhook `OK`/`ERROR` and queue `COMPLETED`+`error` as different vocabularies. Do not wait for queue `FAILED`.
5. Queue-result retrieval window is **~1 hour** after completion for typical small JSON (our case), **~6 minutes** if result ≥ 10 KB, and shorter if store-IO is off or result > 1 MB.
6. Webhook: ack `2xx` within **15s** (first try) / **120s** (retries); up to **31** retries; no redirects; no localhost. Then still GET the queue.
7. Cancel is `PUT .../cancel` / `fal.queue.cancel`; `IN_PROGRESS` may still complete.
8. Brainrot has **two** fal requests per export (compose, then subtitle). After compose, `providerRequestId`/`providerEndpoint` point at the **current** step only.
