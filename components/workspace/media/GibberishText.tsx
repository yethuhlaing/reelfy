'use client'

import { useEffect, useState } from 'react'

interface Props {
  pool: string[]
  intervalMs?: number
}

export function GibberishText({ pool, intervalMs = 800 }: Props) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * pool.length))
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    let fadeTimer: ReturnType<typeof setTimeout> | null = null

    const start = () => {
      stop()
      timer = setInterval(() => {
        setVisible(false)
        fadeTimer = setTimeout(() => {
          setIdx((i) => {
            let next = i
            if (pool.length > 1) {
              while (next === i) next = Math.floor(Math.random() * pool.length)
            }
            return next
          })
          setVisible(true)
        }, 200)
      }, intervalMs)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      if (fadeTimer) clearTimeout(fadeTimer)
      timer = null
      fadeTimer = null
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [pool, intervalMs])

  return (
    <div className="gibberish-text" style={{ opacity: visible ? 1 : 0 }}>
      {pool[idx]}
    </div>
  )
}
