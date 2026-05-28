"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/shared/lib/utils"

interface PlaceholdersAndVanishInputProps {
  id?: string
  placeholders: string[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  inputClassName?: string
}

export function PlaceholdersAndVanishInput({
  id,
  placeholders,
  value,
  onChange,
  disabled,
  className,
  inputClassName,
}: PlaceholdersAndVanishInputProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (placeholders.length <= 1) return
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 2600)
    return () => clearInterval(interval)
  }, [placeholders])

  const activePlaceholder =
    placeholders[placeholderIndex] ?? "Describe what you want to generate"

  return (
    <div className={cn("relative", className)}>
      <textarea
        id={id}
        ref={textareaRef}
        value={value}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "min-h-40 w-full resize-none rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-solid)] px-5 py-4 text-[0.95rem] leading-relaxed text-[var(--text)] outline-none transition focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px] disabled:cursor-not-allowed disabled:opacity-60",
          inputClassName,
        )}
        placeholder=""
      />
      <div className="pointer-events-none absolute inset-x-5 top-4 overflow-hidden text-[0.92rem] leading-relaxed text-[var(--muted)]">
        <AnimatePresence mode="wait">
          {!value && !isFocused && (
            <motion.span
              key={placeholderIndex}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="block whitespace-pre-wrap"
            >
              {activePlaceholder}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
