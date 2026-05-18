import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/externals/betterauth'

export const { GET, POST } = toNextJsHandler(auth)
