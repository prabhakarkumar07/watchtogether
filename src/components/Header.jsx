import React, { useEffect, useRef, useState } from 'react'
import { Clapperboard, Check, Copy, Moon, Sun, Wifi, Settings, Hand } from 'lucide-react'
import Tooltip from './Tooltip.jsx'

export default React.memo(function Header({
  theme,
  onToggleTheme,
  roomStatus,
  roomCode,
  onCopyLink,
  onLeaveRoom,
  activeLayout,
  setActiveLayout,
  layouts = [],
  onOpenSettings,
  raisedHands = new Set(),
  selfId,
  toggleHand,
}) {
  const connected  = roomStatus === 'connected'
  const connecting = roomStatus === 'connecting'

  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const menuRef = useRef(null)

  // Close layout menu on outside click or Escape
  useEffect(() => {
    if (!showLayoutMenu) return
    const onKey = (e) => { if (e.key === 'Escape') setShowLayoutMenu(false) }
    const onPtr = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowLayoutMenu(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPtr)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPtr)
    }
  }, [showLayoutMenu])

  const currentLayout = layouts.find((l) => l.id === activeLayout) || layouts[0]

  return (
    <header
      className="flex h-9 shrink-0 items-center justify-between gap-3 px-3 border-b border-app-border z-30"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex h-6 w-6 items-center justify-center rounded shrink-0"
          style={{ backgroundColor: '#FFB627' }}
          aria-hidden="true"
        >
          <Clapperboard className="h-3.5 w-3.5" style={{ color: '#0A0A0A' }} />
        </div>
        <span className="text-xs font-semibold text-text-primary tracking-tight hidden sm:block">
          Watch Together
        </span>
      </div>

      {/* ── Center — room status chip ──────────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {connected && roomCode && (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-status-online" />
              Connected
            </span>
            <Tooltip content="Copy room link" position="bottom">
              <button
                className="flex items-center gap-1.5 rounded px-2 py-0.5 group transition-colors h-7"
                style={{ backgroundColor: 'rgba(74, 53, 20, 0.4)', border: '1px dashed rgba(255, 182, 39, 0.4)' }}
                onClick={onCopyLink}
                aria-label="Copy room link"
              >
                <span className="font-mono text-xs font-semibold tracking-[0.2em] text-text-primary">
                  {roomCode}
                </span>
                <Copy className="h-2.5 w-2.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </Tooltip>
          </div>
        )}
        {connecting && (
          <span className="flex items-center gap-1 text-[11px] text-accent-amber">
            <Wifi className="h-3 w-3 animate-pulse" />
            Connecting…
          </span>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Layout switcher */}
        {layouts.length > 0 && (
          <div className="relative hidden lg:block" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowLayoutMenu((v) => !v)}
              className="btn-ghost h-7 px-2 gap-1 text-[11px]"
              aria-label="Change layout"
              aria-haspopup="true"
              aria-expanded={showLayoutMenu}
              title="Change layout"
            >
              {currentLayout?.Icon && <currentLayout.Icon className="h-3 w-3" />}
              <span>{currentLayout?.label}</span>
            </button>

            {showLayoutMenu && (
              <div
                className="panel-elevated absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg p-1"
                role="menu"
                aria-label="Layout options"
              >
                {layouts.map((layout) => {
                  const Icon = layout.Icon
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={activeLayout === layout.id}
                      onClick={() => { setActiveLayout(layout.id); setShowLayoutMenu(false) }}
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors hover:bg-app-hover"
                    >
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: activeLayout === layout.id ? '#3B82F6' : '#545769' }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-text-primary">{layout.label}</span>
                        <span className="block text-[10px] text-text-muted">{layout.hint}</span>
                      </span>
                      {activeLayout === layout.id && (
                        <Check className="h-3 w-3 text-accent-blue shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Leave */}
        {connected && (
          <Tooltip content="Leave room" position="bottom">
            <button
              type="button"
              onClick={onLeaveRoom}
              className="btn-ghost h-7 px-2 text-[11px]"
              style={{ color: '#FCA5A5' }}
              aria-label="Leave room"
            >
              Leave
            </button>
          </Tooltip>
        )}

        {/* Raise Hand */}
        {connected && (
          <Tooltip content={raisedHands.has(selfId) ? 'Lower hand' : 'Raise hand'} position="bottom">
            <button
              type="button"
              onClick={toggleHand}
              className={`btn-icon h-7 w-7 ${raisedHands.has(selfId) ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30' : ''}`}
              aria-label="Raise hand"
            >
              <Hand className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        )}

        {/* Settings */}
        <Tooltip content="Device settings" position="bottom">
          <button
            type="button"
            onClick={onOpenSettings}
            className="btn-icon h-7 w-7"
            aria-label="Device settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </Tooltip>

        {/* Theme */}
        <Tooltip content={theme === 'dark' ? 'Light mode' : 'Dark mode'} position="bottom">
          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-icon h-7 w-7"
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark'
              ? <Sun  className="h-3 w-3" />
              : <Moon className="h-3 w-3" />
            }
          </button>
        </Tooltip>
      </div>
    </header>
  )
})
