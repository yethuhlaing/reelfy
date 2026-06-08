import type Lenis from 'lenis'

const DEFAULT_OFFSET = -96

export function scrollToSection(
  href: string,
  lenis?: Lenis | null,
  offset = DEFAULT_OFFSET,
) {
  const id = href.replace(/^#/, '')
  const element = document.getElementById(id)
  if (!element) return false

  if (lenis) {
    lenis.scrollTo(element, { offset, duration: 1.2, force: true })
    return true
  }

  const top = element.getBoundingClientRect().top + window.scrollY + offset
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  return true
}
