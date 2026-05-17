import type { Metadata, Viewport } from 'next'
import { Syne, Azeret_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Sidebar } from '@/components/layout/Sidebar'

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
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="grid min-h-screen [grid-template-columns:var(--sidebar-w,240px)_1fr] transition-[grid-template-columns] duration-200 ease-out" data-collapsed="false">
            <Sidebar />
            <div className="flex min-h-screen min-w-0 flex-col">{children}</div>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
