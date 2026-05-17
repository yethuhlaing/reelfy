'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { SAMPLE_STORY_ID } from '@/data/sample-story'

export function EmptyDashboard({ category }: { category: string }) {
  return (
    <div className="empty-dash">
      <StickmanArt />
      <h3>Bring your story to life</h3>
      <p>Drop a story, press generate, and watch stickman scenes auto-animate with voiceover.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Link href={`/${category}/new`} className="icon-btn icon-btn--primary" style={{ height: 40, padding: '0 16px' }}>
          <Sparkles size={14} /> Create your first story
        </Link>
        <Link href={`/${category}/story/${SAMPLE_STORY_ID}`} className="icon-btn" style={{ height: 40, padding: '0 16px' }}>
          Explore sample <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

function StickmanArt() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <circle cx="48" cy="22" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M48 32 V62 M48 40 L30 50 M48 40 L66 50 M48 62 L34 84 M48 62 L62 84"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="78" cy="14" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="14" cy="40" r="2.5" fill="currentColor" opacity="0.5"/>
    </svg>
  )
}
