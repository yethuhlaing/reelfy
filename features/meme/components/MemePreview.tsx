'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { MemeRenderBox } from '@/shared/lib/types'
import { boxTextCss, displayText } from '../lib/box-style'

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

type DragState =
  | { kind: 'move'; index: number; startX: number; startY: number; origX: number; origY: number }
  | {
      kind: 'resize'
      index: number
      handle: ResizeHandle
      startX: number
      startY: number
      origX: number
      origY: number
      origW: number
      origH: number
    }

/**
 * DOM preview of a meme: the template image with absolutely-positioned caption
 * boxes drawn over it using the shared CSS contract. Matches the server Satori
 * render. When `editable`, boxes can be selected, dragged, and resized.
 */
export function MemePreview({
  imageUrl,
  width,
  height,
  boxes,
  editable = false,
  selectedIndex,
  onSelectBox,
  onMoveBox,
  onResizeBox,
  onEditEnd,
  sizeMode = 'responsive',
  className,
}: {
  imageUrl: string
  width: number
  height: number
  boxes: MemeRenderBox[]
  editable?: boolean
  selectedIndex?: number | null
  onSelectBox?: (index: number) => void
  onMoveBox?: (index: number, xPct: number, yPct: number) => void
  onResizeBox?: (index: number, xPct: number, yPct: number, wPct: number, hPct: number) => void
  onEditEnd?: () => void
  sizeMode?: 'responsive' | 'fit-height'
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const drag = useRef<DragState | null>(null)

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect
      setSize({ w, h })
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const onMovePointerDown = (e: React.PointerEvent, index: number) => {
    if (!editable) return
    e.stopPropagation()
    onSelectBox?.(index)
    const box = boxes.find((b) => b.index === index)
    if (!box) return
    drag.current = {
      kind: 'move',
      index,
      startX: e.clientX,
      startY: e.clientY,
      origX: box.xPct,
      origY: box.yPct,
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onResizePointerDown = (e: React.PointerEvent, index: number, handle: ResizeHandle) => {
    if (!editable) return
    e.stopPropagation()
    onSelectBox?.(index)
    const box = boxes.find((b) => b.index === index)
    if (!box) return
    drag.current = {
      kind: 'resize',
      index,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: box.xPct,
      origY: box.yPct,
      origW: box.wPct,
      origH: box.hPct,
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || size.w === 0) return
    const dxPct = ((e.clientX - d.startX) / size.w) * 100
    const dyPct = ((e.clientY - d.startY) / size.h) * 100
    if (d.kind === 'move') {
      onMoveBox?.(d.index, clamp(d.origX + dxPct, 0, 95), clamp(d.origY + dyPct, 0, 95))
      return
    }
    const next = computeResize(d.handle, dxPct, dyPct, d.origX, d.origY, d.origW, d.origH)
    onResizeBox?.(d.index, next.xPct, next.yPct, next.wPct, next.hPct)
  }

  const onPointerUp = () => {
    if (drag.current) onEditEnd?.()
    drag.current = null
  }

  const containerStyle: CSSProperties =
    sizeMode === 'fit-height'
      ? {
          position: 'relative',
          height: '100%',
          width: 'auto',
          maxWidth: '100%',
          aspectRatio: `${width} / ${height}`,
          userSelect: 'none',
        }
      : {
          position: 'relative',
          width: '100%',
          aspectRatio: `${width} / ${height}`,
          userSelect: 'none',
        }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }} draggable={false} />
      {boxes.map((box) => {
        const boxWidthPx = (box.wPct / 100) * size.w
        const boxHeightPx = (box.hPct / 100) * size.h
        const selected = editable && selectedIndex === box.index
        return (
          <div
            key={box.index}
            onPointerDown={(e) => onMovePointerDown(e, box.index)}
            style={{
              position: 'absolute',
              left: `${box.xPct}%`,
              top: `${box.yPct}%`,
              width: `${box.wPct}%`,
              height: `${box.hPct}%`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: box.align === 'left' ? 'flex-start' : box.align === 'right' ? 'flex-end' : 'center',
              overflow: 'hidden',
              cursor: editable ? 'move' : 'default',
              outline: selected ? '2px dashed rgba(99,102,241,0.9)' : 'none',
              boxShadow: selected ? '0 0 0 9999px rgba(0,0,0,0.02)' : 'none',
            }}
          >
            <div style={boxTextCss(box, boxWidthPx, boxHeightPx)}>{displayText(box)}</div>
            {selected &&
              (['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
                <div
                  key={handle}
                  onPointerDown={(e) => onResizePointerDown(e, box.index, handle)}
                  style={resizeHandleStyle(handle)}
                />
              ))}
          </div>
        )
      })}
    </div>
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

const MIN_W_PCT = 5
const MIN_H_PCT = 3

function computeResize(
  handle: ResizeHandle,
  dxPct: number,
  dyPct: number,
  origX: number,
  origY: number,
  origW: number,
  origH: number,
): { xPct: number; yPct: number; wPct: number; hPct: number } {
  let x = origX
  let y = origY
  let w = origW
  let h = origH

  switch (handle) {
    case 'se':
      w = clamp(origW + dxPct, MIN_W_PCT, 100 - origX)
      h = clamp(origH + dyPct, MIN_H_PCT, 100 - origY)
      break
    case 'sw':
      w = clamp(origW - dxPct, MIN_W_PCT, origX + origW)
      h = clamp(origH + dyPct, MIN_H_PCT, 100 - origY)
      x = origX + origW - w
      break
    case 'ne':
      w = clamp(origW + dxPct, MIN_W_PCT, 100 - origX)
      h = clamp(origH - dyPct, MIN_H_PCT, origY + origH)
      y = origY + origH - h
      break
    case 'nw':
      w = clamp(origW - dxPct, MIN_W_PCT, origX + origW)
      h = clamp(origH - dyPct, MIN_H_PCT, origY + origH)
      x = origX + origW - w
      y = origY + origH - h
      break
  }

  return { xPct: clamp(x, 0, 95), yPct: clamp(y, 0, 95), wPct: w, hPct: h }
}

function resizeHandleStyle(handle: ResizeHandle): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    background: 'rgba(99,102,241,0.95)',
    border: '1px solid #fff',
    borderRadius: 2,
    touchAction: 'none',
    zIndex: 1,
  }
  switch (handle) {
    case 'nw':
      return { ...base, top: -5, left: -5, cursor: 'nwse-resize' }
    case 'ne':
      return { ...base, top: -5, right: -5, cursor: 'nesw-resize' }
    case 'sw':
      return { ...base, bottom: -5, left: -5, cursor: 'nesw-resize' }
    case 'se':
      return { ...base, bottom: -5, right: -5, cursor: 'nwse-resize' }
  }
}
