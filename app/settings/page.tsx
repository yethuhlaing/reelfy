import { TopBar } from '@/components/layout/TopBar'

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />
      <div className="dashboard">
        <div className="empty-dash">
          <h3>Coming soon</h3>
          <p>Account, billing, providers, and theme settings will live here.</p>
        </div>
      </div>
    </>
  )
}
