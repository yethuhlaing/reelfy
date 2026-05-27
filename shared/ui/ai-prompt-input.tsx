"use client"

import { PlaceholdersAndVanishInput } from "@/shared/ui/placeholders-and-vanish-input"

interface AiPromptInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholders: string[]
  disabled?: boolean
}

export function AiPromptInput({
  id,
  label,
  value,
  onChange,
  placeholders,
  disabled,
}: AiPromptInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[0.8rem] text-[var(--muted)]">
        {label}
      </label>
      <PlaceholdersAndVanishInput
        id={id}
        placeholders={placeholders}
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputClassName="h-16"
      />
    </div>
  )
}
