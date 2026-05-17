'use client'

import type { GenerateOptions } from '@/lib/types'

interface Props {
  value: GenerateOptions
  onChange: (next: GenerateOptions) => void
  disabled?: boolean
}

export function AdvancedConfig({ value, onChange, disabled }: Props) {
  const set = <K extends keyof GenerateOptions>(k: K, v: GenerateOptions[K]) =>
    onChange({ ...value, [k]: v })
  return (
    <div className="advanced-grid">
      <Field label="Scene density" hint="How many scenes to plan">
        <select value={value.density} onChange={(e) => set('density', e.target.value as GenerateOptions['density'])} disabled={disabled}>
          {['8','10','12','16','20','25','30','35','40','45','50','55','60'].map((n) => (
            <option key={n} value={n}>{n} scenes</option>
          ))}
        </select>
      </Field>
      <Field label="Stick style" hint="Visual style of characters">
        <select value={value.style} onChange={(e) => set('style', e.target.value as GenerateOptions['style'])} disabled={disabled}>
          <option value="minimal">Minimal</option>
          <option value="expressive">Expressive</option>
          <option value="dramatic">Dramatic</option>
        </select>
      </Field>
      <Field label="Voice tone" hint="Voiceover delivery">
        <select value={value.tone} onChange={(e) => set('tone', e.target.value as GenerateOptions['tone'])} disabled={disabled}>
          <option value="inspirational">Inspirational</option>
          <option value="casual">Casual</option>
          <option value="documentary">Documentary</option>
          <option value="pitch">Pitch</option>
        </select>
      </Field>
      <Field label="Script model" hint="LLM for script + scene plan">
        <select value={value.textModel} onChange={(e) => set('textModel', e.target.value as GenerateOptions['textModel'])} disabled={disabled}>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash — default (Google)</option>
          <option value="groq/llama-3.3-70b-versatile">Llama 3.3 70B — free (Groq)</option>
          <option value="groq/deepseek-r1-distill-llama-70b">DeepSeek R1 70B — free (Groq)</option>
          <option value="nvidia/nemotron-ultra-253b-v1">Nemotron Ultra 253B — free (NVIDIA)</option>
        </select>
      </Field>
      <Field label="Image model" hint="Per-scene image">
        <select value={value.imageModel} onChange={(e) => set('imageModel', e.target.value as GenerateOptions['imageModel'])} disabled={disabled}>
          <option value="flux-schnell-fal">Flux Schnell — fast · $0.003</option>
          <option value="sdxl-lightning-fal">SDXL Lightning — fastest · $0.002</option>
          <option value="flux-dev-fal">Flux Dev — quality · $0.04</option>
        </select>
      </Field>
      <Field label="Video model" hint="Per-scene animation">
        <select value={value.videoModel} onChange={(e) => set('videoModel', e.target.value as GenerateOptions['videoModel'])} disabled={disabled}>
          <option value="ltx-video-fal">LTX Video — fast · $0.02</option>
          <option value="longcat-fal">LongCat — balanced · $0.03</option>
          <option value="kling-fal">Kling v2.6 — quality · $0.05</option>
        </select>
      </Field>
      <Field label="Video quality" hint="Output resolution">
        <select value={value.videoQuality} onChange={(e) => set('videoQuality', e.target.value as GenerateOptions['videoQuality'])} disabled={disabled}>
          <option value="720p">720p</option>
          <option value="1080p">1080p</option>
        </select>
      </Field>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label title={hint}>{label}</label>
      {children}
    </div>
  )
}
