export const VISUAL_COUNT_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: String(n) }
})
