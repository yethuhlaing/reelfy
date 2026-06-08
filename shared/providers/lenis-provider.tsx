'use client'

import { ReactLenis, useLenis } from 'lenis/react'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const LENIS_OPTIONS = {
  lerp: 0.1,
  wheelMultiplier: 1.15,
  smoothWheel: true,
  autoRaf: true,
  anchors: {
    offset: -96,
    duration: 1.2,
  },
  stopInertiaOnNavigate: true,
} as const

function LenisScrollTriggerBridge() {
  const lenis = useLenis()

  useEffect(() => {
    if (!lenis) return
    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)
    return () => {
      lenis.off('scroll', onScroll)
    }
  }, [lenis])

  return null
}

function LenisRouteScrollReset() {
  const pathname = usePathname()
  const lenis = useLenis()

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true, force: true })
  }, [pathname, lenis])

  return null
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)

    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    setReady(true)

    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!ready || reducedMotion) {
    return <>{children}</>
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <LenisRouteScrollReset />
      <LenisScrollTriggerBridge />
      {children}
    </ReactLenis>
  )
}
