'use client'

import { useEffect, useRef, useState } from 'react'

type UseLazyVideoSourceOptions = {
  /** Load when within this margin of the viewport (CSS length). */
  rootMargin?: string
  /** Skip lazy loading — load immediately (above-the-fold heroes). */
  eager?: boolean
}

/**
 * Defers assigning a remote video URL until the container is near the viewport.
 * Cuts simultaneous Blob requests on long landing pages.
 */
export function useLazyVideoSource<T extends HTMLElement = HTMLElement>(
  options: UseLazyVideoSourceOptions = {},
) {
  const { rootMargin = '400px', eager = false } = options
  const containerRef = useRef<T>(null)
  const [shouldLoad, setShouldLoad] = useState(eager)

  useEffect(() => {
    if (eager || shouldLoad) return

    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0.01 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [eager, rootMargin, shouldLoad])

  return { containerRef, shouldLoad }
}
