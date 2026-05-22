import { redirect } from 'next/navigation'

interface SignupPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const redirectParam = params.redirect
  if (redirectParam && redirectParam.startsWith('/')) {
    redirect(`/auth/login?redirect=${encodeURIComponent(redirectParam)}`)
  }
  redirect('/auth/login')
}
