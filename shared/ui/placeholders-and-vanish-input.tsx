"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/shared/lib/utils"

interface PlaceholdersAndVanishInputProps {
  id?: string
  placeholders: string[]
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
  className?: string
  inputClassName?: string
  buttonClassName?: string
}

export function PlaceholdersAndVanishInput({
  id,
  placeholders,
  value,
  onChange,
  onSubmit,
  disabled,
  className,
  inputClassName,
  buttonClassName,
}: PlaceholdersAndVanishInputProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (placeholders.length <= 1) return
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
    }, 2600)
    return () => clearInterval(interval)
  }, [placeholders])

  const drawVanishFrame = () => {
    const canvas = canvasRef.current
    if (!canvas) return false
    const ctx = canvas.getContext("2d")
    if (!ctx) return false

    const width = canvas.width
    const height = canvas.height
    const lineY = Math.floor(height / 2)

    ctx.clearRect(0, 0, width, height)
    for (let i = 0; i < 42; i += 1) {
      const x = Math.random() * width
      const alpha = Math.random() * 0.3
      const len = 8 + Math.random() * 20
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`
      ctx.beginPath()
      ctx.moveTo(x, lineY + Math.random() * 14 - 7)
      ctx.lineTo(x - len, lineY + Math.random() * 14 - 7)
      ctx.stroke()
    }
    return true
  }

  const runVanish = () => {
    if (!value.trim() || animating) return
    setAnimating(true)
    let frame = 0
    const step = () => {
      frame += 1
      drawVanishFrame()
      if (frame < 12) {
        requestAnimationFrame(step)
        return
      }
      setAnimating(false)
      onSubmit?.()
    }
    requestAnimationFrame(step)
  }

  const activePlaceholder =
    placeholders[placeholderIndex] ?? "Describe what you want to generate"

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={1200}
        height={56}
        className={cn(
          "pointer-events-none absolute inset-x-3 top-1/2 hidden h-10 -translate-y-1/2 md:block",
          animating ? "opacity-100" : "opacity-0",
        )}
      />
      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            runVanish()
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 pr-14 text-[0.95rem] text-[var(--text)] outline-none transition focus:border-transparent focus:outline-2 focus:outline-[var(--accent)] focus:outline-offset-[-1px] disabled:cursor-not-allowed disabled:opacity-60",
          inputClassName,
        )}
        placeholder=""
      />
      <div className="pointer-events-none absolute inset-y-0 left-4 right-16 flex items-center overflow-hidden text-[0.92rem] text-[var(--muted)]">
        <AnimatePresence mode="wait">
          {!value && !isFocused && (
            <motion.span
              key={placeholderIndex}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="line-clamp-1"
            >
              {activePlaceholder}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={runVanish}
        disabled={disabled || !value.trim()}
        aria-label="Submit prompt"
        className={cn(
          "absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-transparent bg-[var(--accent)] text-[var(--accent-ink)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45",
          buttonClassName,
        )}
      >
        <ArrowUp size={16} />
      </motion.button>
    </div>
  )
}
