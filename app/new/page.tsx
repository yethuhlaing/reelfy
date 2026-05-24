import Link from 'next/link'
import { ArrowRight, Clapperboard, Palette, Sparkles } from 'lucide-react'

const CATEGORIES = [
  {
    id: 'stickman',
    label: 'Stickman',
    status: 'Available now',
    description: 'Fast visual storytelling with simple characters, clear actions, and expressive scenes.',
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    status: 'Coming soon',
    description: 'Hand-drawn explainer style for educational and business walkthroughs.',
  },
  {
    id: 'comic',
    label: 'Comic',
    status: 'Coming soon',
    description: 'Panel-based storytelling with stronger contrast, drama, and punchier moments.',
  },
  {
    id: 'doodle',
    label: 'Doodle',
    status: 'Coming soon',
    description: 'Casual sketch style focused on playful ideas and social-ready short videos.',
  },
]

const SAMPLE_VIDEOS = [
  {
    title: 'Founder Journey',
    angle: 'Startup origin story with clear beginning, tension, and payoff.',
  },
  {
    title: 'Product Explainer',
    angle: 'Show a problem, then break down how your product solves it in scenes.',
  },
  {
    title: 'Educational Story',
    angle: 'Teach a topic with short scene-by-scene visual metaphors and voiceover.',
  },
]

const BRANDING_NOTES = [
  'Keep one consistent protagonist, color accent, and voice tone across scenes.',
  'Use your brand promise in the opening scene and repeat it in the ending CTA.',
  'Prefer concise voiceover lines so visuals and narration stay aligned and clear.',
]

export default function NewPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
          <Sparkles size={16} /> Plan before generating
        </div>
        <h1 className="mt-2 font-[var(--font-heading)] text-3xl">Build a stronger story brief</h1>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          Use this page to pick your category, review direction ideas, and align your brand voice before opening the editor.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/stickman/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] transition hover:brightness-105"
          >
            Start in Stickman <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {CATEGORIES.map((category) => (
          <article key={category.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-[var(--font-heading)] text-xl">{category.label}</h2>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                {category.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{category.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <Clapperboard size={15} /> Sample video directions
          </div>
          <div className="mt-3 space-y-3">
            {SAMPLE_VIDEOS.map((video) => (
              <div key={video.title} className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
                <h3 className="text-sm font-semibold text-[var(--text)]">{video.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{video.angle}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <Palette size={15} /> Branding checklist
          </div>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            {BRANDING_NOTES.map((note) => (
              <li key={note} className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2">
                {note}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}
