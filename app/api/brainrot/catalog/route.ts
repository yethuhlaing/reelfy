import { GAMEPLAY_CATALOG } from '@/shared/data/gameplay-catalog'

export const runtime = 'nodejs'

export async function GET() {
  return Response.json({
    categories: GAMEPLAY_CATALOG,
  })
}
