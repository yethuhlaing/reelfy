import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/shared/ui/sonner'
import { ThemeProvider } from '@/shared/providers/theme-provider'
import { AppShell } from '@/shared/layout/app-shell'
import { getSessionUser } from '@/features/auth/server/auth-session'
import { getUserSession } from '@/shared/lib/db/user'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jb-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StickStory — AI Video Generator for Stories',
  description: 'Turn any story into animated stickman video with AI.',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getUserSession()
  const currentUser = getSessionUser(session)

  return (
    <html lang="en" suppressHydrationWarning className={`${jakartaSans.variable} ${jbMono.variable}`}>
      <head>
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppShell currentUser={currentUser}>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
