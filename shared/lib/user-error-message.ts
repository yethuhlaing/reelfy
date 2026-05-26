const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

/** Messages we intentionally return from our APIs — safe to show as-is. */
function isSafeUserMessage(message: string): boolean {
  if (message.length > 140) return false
  if (/https?:\/\//i.test(message)) return false
  if (/\[GoogleGenerativeAI|generativelanguage|Error fetching from/i.test(message)) return false
  if (/must be one of:/i.test(message)) return false
  if (/at\s+\S+\.(ts|js|tsx|jsx):\d+/i.test(message)) return false
  return true
}

function mapKnownError(message: string): string | null {
  const lower = message.toLowerCase()

  if (/insufficient credits:\s*have\s*(\d+),\s*need\s*(\d+)/i.test(message)) {
    const m = message.match(/have\s*(\d+),\s*need\s*(\d+)/i)
    if (m) return `Not enough credits. You have ${m[1]} but need ${m[2]}.`
    return 'Not enough credits to start generation.'
  }

  if (/spending cap|monthly spending|project spend/i.test(lower)) {
    return 'Prompt generation is temporarily unavailable. Please try again later.'
  }

  if (/429|too many requests|rate limit|quota exceeded/i.test(lower)) {
    return 'Too many requests right now. Please wait a moment and try again.'
  }

  if (
    /googlegenerativeai|generativelanguage|gemini|groq api|nvidia api|openai\/v1\/chat/i.test(lower)
  ) {
    return 'Could not generate prompts right now. Please try again in a few minutes.'
  }

  if (/failed to expand prompts/i.test(lower)) {
    return 'Could not generate prompts from your vibe. Try rephrasing or try again.'
  }

  if (/targetdurationsec|invalid json|musicmodel is required|visualconfig is required/i.test(lower)) {
    return 'Some settings are invalid. Check your choices and try again.'
  }

  if (/vibe is required/i.test(lower)) {
    return 'Describe your vibe first.'
  }

  if (/vibe needs at least/i.test(lower)) {
    return message
  }

  if (/network|fetch failed|failed to fetch|econnrefused|timeout/i.test(lower)) {
    return 'Connection problem. Check your network and try again.'
  }

  return null
}

/** Turn raw API / provider errors into short, user-safe copy. */
export function toUserErrorMessage(raw: unknown, fallback = DEFAULT_MESSAGE): string {
  const message =
    typeof raw === 'string'
      ? raw.trim()
      : raw instanceof Error
        ? raw.message.trim()
        : ''

  if (!message) return fallback

  const mapped = mapKnownError(message)
  if (mapped) return mapped

  if (isSafeUserMessage(message)) return message

  return fallback
}
