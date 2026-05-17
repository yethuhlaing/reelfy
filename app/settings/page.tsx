import { TopBar } from '@/components/layout/TopBar'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />
      <div className="dashboard">
        <SettingsPanel />
      </div>
    </>
  )
}
