'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { isMarketingPath } from '@/shared/lib/marketing-path'

export function ThemeProvider({ children, forcedTheme, ...props }: ThemeProviderProps) {
  const pathname = usePathname()
  const marketingForcedTheme = isMarketingPath(pathname) ? 'dark' : forcedTheme

  // next-themes injects an inline <script> to prevent theme flicker on first paint.
  // React 19 warns when <script> is rendered inside client components; the SSR script
  // already ran, so we mark it non-executable during client hydration only.
  const scriptProps =
    typeof window === 'undefined'
      ? undefined
      : ({ type: 'application/json' } as const)

  return (
    <NextThemesProvider
      scriptProps={scriptProps}
      {...props}
      forcedTheme={marketingForcedTheme}
    >
      {children}
    </NextThemesProvider>
  )
}
