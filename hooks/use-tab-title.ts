'use client'

import { useEffect } from 'react'

const BASE = 'StickStory'

export function useTabTitle(unreadCount: number): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE}` : BASE
  }, [unreadCount])
}
