import { randomUUID } from 'node:crypto'
import { requireUserSession, isAuthError } from '@/shared/lib/db/user'
import {
  getBrainrotProjectForUser,
  insertBrainrotProject,
  updateBrainrotProject,
} from '@/features/brainrot/server/brainrot-db'
import { BRAINROT_SCRIPT_MAX_WORDS } from '@/features/brainrot/constants'
import type { BrainrotFormat } from '@/shared/lib/types/brainrot'

export const runtime = 'nodejs'
export const maxDuration = 30

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), { status: 400 })
}

const FORMATS: BrainrotFormat[] = ['facts', 'narrative', 'explainer']

function countWords(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

// Fallback title: first ~6 words of the script.
function deriveTitle(script: string): string {
  return script.trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 80)
}

// Persist a brainrot draft — the user's script verbatim, no AI. The AI writer
// lives in the separate `write` route. Upserts by projectId.
export async function POST(request: Request) {
  const session = await requireUserSession(request)
  if (isAuthError(session)) return session
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  if (!body) return badRequest('Invalid JSON')

  const { projectId, script, title, format } = body as {
    projectId?: string
    script?: string
    title?: string
    format?: string
  }

  if (!script || script.trim().length < 3) {
    return badRequest('Script needs at least 3 characters')
  }
  if (countWords(script) > BRAINROT_SCRIPT_MAX_WORDS) {
    return badRequest(`Script is too long (max ${BRAINROT_SCRIPT_MAX_WORDS} words)`)
  }
  if (!format || !FORMATS.includes(format as BrainrotFormat)) {
    return badRequest('Invalid format')
  }

  const trimmedScript = script.trim()
  const resolvedFormat = format as BrainrotFormat
  const resolvedTitle = title?.trim() || deriveTitle(trimmedScript)

  const id = projectId ?? randomUUID()
  const existing = projectId ? await getBrainrotProjectForUser(projectId, userId) : null

  if (existing) {
    await updateBrainrotProject(id, userId, {
      title: resolvedTitle,
      script: trimmedScript,
      format: resolvedFormat,
      status: 'script_ready',
    })
  } else {
    await insertBrainrotProject({
      id,
      userId,
      title: resolvedTitle,
      script: trimmedScript,
      format: resolvedFormat,
      status: 'script_ready',
    })
  }

  return Response.json({ projectId: id, title: resolvedTitle, script: trimmedScript })
}
