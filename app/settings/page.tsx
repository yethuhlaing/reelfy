import { TopBar } from '@/components/layout/TopBar'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-7 px-7 pb-20 pt-7">
        <SettingsPanel />
      </div>
    </>
  )
}
