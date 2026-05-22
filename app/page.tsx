import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Hello world</h1>
      <p className="max-w-xl text-sm text-[var(--muted)]">
        This is a public landing page. Sign in or create an account to open your dashboard.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/auth/login"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface2)]"
        >
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] hover:opacity-90"
        >
          Sign up
        </Link>
      </div>
    </main>
  )
}
