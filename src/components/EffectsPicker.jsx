import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, BellOff, Bell } from 'lucide-react'

const EFFECTS_LIST = [
  { id: 'confetti',    icon: '🎊', name: 'Confetti' },
  { id: 'hearts',     icon: '❤️', name: 'Hearts'   },
  { id: 'likes',      icon: '👍', name: 'Likes'    },
  { id: 'emojis',     icon: '😂', name: 'Laugh'    },
  { id: 'fire',       icon: '🔥', name: 'Fire'     },
  { id: 'sparkles',   icon: '✨', name: 'Sparkles' },
  { id: 'stars',      icon: '⭐', name: 'Stars'    },
  { id: 'petals',     icon: '🌸', name: 'Petals'   },
  { id: 'balloons',   icon: '🎈', name: 'Balloons' },
  { id: 'snow',       icon: '❄️', name: 'Snow'     },
  { id: 'rain',       icon: '🌧️', name: 'Rain'     },
  { id: 'partypopper',icon: '🎉', name: 'Party'    },
]

// Default position: bottom-right corner
const DEFAULT_POS = { x: window.innerWidth - 80, y: window.innerHeight - 80 }

export default function EffectsPicker({ sendEffect }) {
  const [isOpen,     setIsOpen]     = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [lastEffect, setLastEffect] = useState('confetti')

  // Drag state
  const [pos,        setPos]        = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('effectsFabPos'))
      if (saved && saved.x >= 0 && saved.y >= 0) return saved
    } catch { /* ignore */ }
    return DEFAULT_POS
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragOrigin  = useRef(null) // { startX, startY, origX, origY }
  const hasDragged  = useRef(false)
  const containerRef = useRef(null)
  const menuRef      = useRef(null)

  // ── Initialization ────────────────────────────────────────────────────────
  useEffect(() => {
    setIsDisabled(localStorage.getItem('disableEffects') === 'true')
    const saved = localStorage.getItem('lastEffect')
    if (saved) setLastEffect(saved)

    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // ── Keep FAB inside viewport on resize ───────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth  - 64),
        y: Math.min(prev.y, window.innerHeight - 64),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    // Release implicit pointer capture so window gets pointermove/pointerup
    e.currentTarget.releasePointerCapture(e.pointerId)
    hasDragged.current = false
    dragOrigin.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX:  pos.x,
      origY:  pos.y,
    }
    setIsDragging(true)
  }, [pos])

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e) => {
      const dx = e.clientX - dragOrigin.current.startX
      const dy = e.clientY - dragOrigin.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDragged.current = true
      const newX = Math.max(8, Math.min(window.innerWidth  - 64, dragOrigin.current.origX + dx))
      const newY = Math.max(8, Math.min(window.innerHeight - 64, dragOrigin.current.origY + dy))
      setPos({ x: newX, y: newY })
    }

    const onUp = () => {
      setIsDragging(false)
      try { localStorage.setItem('effectsFabPos', JSON.stringify(pos)) } catch { /* ignore */ }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
    }
  }, [isDragging, pos])

  // ── Actions ───────────────────────────────────────────────────────────────
  const toggleDisabled = () => {
    const next = !isDisabled
    setIsDisabled(next)
    localStorage.setItem('disableEffects', next.toString())
  }

  const triggerEffect = (id) => {
    setLastEffect(id)
    localStorage.setItem('lastEffect', id)
    sendEffect(id)
  }

  const handleFabClick = (e) => {
    // Don't toggle menu if the user was dragging
    if (hasDragged.current) return
    e.stopPropagation()
    setIsOpen(v => !v)
  }

  // Decide whether the menu opens upward or downward based on FAB Y position
  const openUpward = pos.y > window.innerHeight / 2

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left:     pos.x,
        top:      pos.y,
        zIndex:   40,
        // Smooth only when NOT dragging to avoid lag
        transition: isDragging ? 'none' : 'left 0.15s, top 0.15s',
        userSelect: 'none',
      }}
    >
      {/* ── Popup menu ── */}
      <div
        ref={menuRef}
        className={`absolute w-72 rounded-xl border border-app-border panel-elevated shadow-2xl transition-all duration-200 bg-app-toolbar ${
          isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'pointer-events-none scale-95 opacity-0'
        } ${openUpward ? 'bottom-[72px] origin-bottom-left' : 'top-[72px] origin-top-left'}`}
        style={{ left: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Drag hint */}
            <span className="text-[10px] text-text-muted select-none">✦ drag me</span>
            <h3 className="text-sm font-semibold text-text-primary">Celebrations</h3>
          </div>
          <button
            onClick={toggleDisabled}
            className="text-text-muted hover:text-white transition-colors"
            title={isDisabled ? 'Enable incoming effects' : 'Mute incoming effects'}
            aria-label="Toggle effects"
          >
            {isDisabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </button>
        </div>

        {/* Effect grid */}
        <div className="grid grid-cols-4 gap-2 p-3">
          {EFFECTS_LIST.map((effect) => (
            <button
              key={effect.id}
              onClick={() => triggerEffect(effect.id)}
              disabled={isDisabled}
              className={`flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all ${
                isDisabled
                  ? 'opacity-50 cursor-not-allowed grayscale'
                  : 'hover:bg-app-hover active:scale-95'
              }`}
              style={lastEffect === effect.id && !isDisabled ? { backgroundColor: 'rgba(59,130,246,0.12)' } : {}}
            >
              <span className="text-xl leading-none">{effect.icon}</span>
              <span className="text-[10px] font-medium text-text-secondary">{effect.name}</span>
            </button>
          ))}
        </div>

        {isDisabled && (
          <div className="px-4 pb-3 text-center text-[10px] text-status-warning">
            Effects are currently muted.
          </div>
        )}
      </div>

      {/* ── FAB button ── */}
      <button
        onPointerDown={onPointerDown}
        onClick={handleFabClick}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform ${
          isDragging
            ? 'cursor-grabbing scale-110 shadow-2xl'
            : 'cursor-grab hover:scale-105 active:scale-95'
        }`}
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: isDragging
            ? '0 20px 60px rgba(59,130,246,0.5), 0 0 0 4px rgba(139,92,246,0.3)'
            : '0 8px 32px rgba(59,130,246,0.35)',
        }}
        aria-label="Celebrations"
        title="Celebrations — drag to move"
      >
        <Sparkles className={`h-6 w-6 text-white transition-transform ${isDragging ? 'rotate-12' : ''}`} />

        {/* Last-used emoji badge */}
        <span
          className="pointer-events-none absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] shadow-md"
          aria-hidden="true"
        >
          {EFFECTS_LIST.find(e => e.id === lastEffect)?.icon || '🎊'}
        </span>

        {/* Drag indicator ring — shown while dragging */}
        {isDragging && (
          <span className="pointer-events-none absolute inset-0 rounded-full animate-ping bg-accent-blue/30" />
        )}
      </button>
    </div>
  )
}
