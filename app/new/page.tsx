import { NewPageClient } from './_NewPageClient'

export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  return <NewPageClient category={category} />
}
