'use client'

import { useMemo, useState } from 'react'

type SettingsSection = 'account' | 'billing' | 'providers' | 'theme'

const SECTIONS: { id: SettingsSection; label: string; description: string }[] = [
  {
    id: 'account',
    label: 'Account',
    description: 'Profile, email, password, and session management.',
  },
  {
    id: 'billing',
    label: 'Billing',
    description: 'Plan, invoices, usage history, and payment methods.',
  },
  {
    id: 'providers',
    label: 'Providers',
    description: 'Model provider keys and defaults for generation.',
  },
  {
    id: 'theme',
    label: 'Theme',
    description: 'Appearance and UI preferences.',
  },
]

export function SettingsPanel() {
  const [section, setSection] = useState<SettingsSection>('account')
  const active = useMemo(() => SECTIONS.find((s) => s.id === section) ?? SECTIONS[0], [section])

  return (
    <section className="flex w-full flex-col gap-3.5">
      <div>
        <h2 className="font-[var(--font-heading)] text-[1.15rem]">Settings</h2>
        <p className="mt-0.5 text-[0.85rem] text-[var(--muted)]">Pick a section from the list.</p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[220px_1fr]">
        <aside className="flex h-fit flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="px-1.5 pb-2 pt-1 text-[0.72rem] uppercase tracking-[0.08em] text-[var(--muted)]">Settings</div>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`w-full rounded-lg border border-transparent px-2.5 py-2 text-left text-[0.85rem] text-[var(--text)] transition hover:bg-[var(--surface2)] ${section === s.id ? 'border-[var(--border)] bg-[var(--surface2)] text-[var(--accent)]' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </aside>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h3 className="font-[var(--font-heading)] text-base">{active.label}</h3>
          <p className="mt-1 text-[0.85rem] text-[var(--muted)]">{active.description}</p>
          <div className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-3 text-[0.82rem] text-[var(--muted)]">
            {active.label} settings UI will be added in the next pass.
          </div>
        </div>
      </div>
    </section>
  )
}
