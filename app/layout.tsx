import type { Metadata, Viewport } from 'next'
import { Syne, Azeret_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AppShell } from '@/components/layout/app-shell'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const azeretMono = Azeret_Mono({
  subsets: ['latin'],
  variable: '--font-azeret',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StickStory — AI Video Generator for Stories',
  description: 'Turn any story into animated stickman video with AI.',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${syne.variable} ${azeretMono.variable}`}>
      <head>
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
