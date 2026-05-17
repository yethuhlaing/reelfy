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
    <section className="settings-shell">
      <div className="settings-head">
        <h2>Settings</h2>
        <p>Pick a section from the list.</p>
      </div>

      <div className="settings-layout">
        <aside className="settings-nav">
          <div className="settings-nav-label">Settings</div>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`settings-nav-item ${section === s.id ? 'active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </aside>

        <div className="settings-card">
          <h3>{active.label}</h3>
          <p>{active.description}</p>
          <div className="settings-placeholder">
            {active.label} settings UI will be added in the next pass.
          </div>
        </div>
      </div>
    </section>
  )
}
