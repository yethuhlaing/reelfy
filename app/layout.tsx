import type { Metadata, Viewport } from 'next'
import { Syne, Azeret_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

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
  title: 'StickStory - Turn Your Startup Story Into Animation',
  description: 'Convert your founder story into animated stickman scenes with AI-generated visuals and voiceover.',
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
    <html lang="en" className={`${syne.variable} ${azeretMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { document.body.removeAttribute('cz-shortcut-listen'); } catch(e) {}`,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
