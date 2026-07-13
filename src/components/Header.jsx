import { Clapperboard, Check, Copy, Moon, Sun, Wifi } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function Header({
  theme,
  onToggleTheme,
  roomStatus,
  roomCode,
  onCopyLink,
  onLeaveRoom,
  activeLayout,
  setActiveLayout,
  layouts = [],
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
      className="flex h-12 shrink-0 items-center justify-between gap-3 px-4 border-b border-app-border z-30"
      style={{ backgroundColor: '#0C0D13' }}
    >
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{ backgroundColor: '#E8E9F0' }}
          aria-hidden="true"
        >
          <Clapperboard className="h-4 w-4" style={{ color: '#090A0F' }} />
        </div>
        <span className="text-sm font-semibold text-text-primary tracking-tight hidden sm:block">
          Watch Together
        </span>
      </div>

      {/* ── Center — room status chip ──────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {connected && roomCode && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-status-online" />
              Connected
            </span>
            <button
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 group transition-colors"
              style={{ backgroundColor: '#161820', border: '1px solid #2A2D3A' }}
              onClick={onCopyLink}
              title="Click to copy room link"
              aria-label="Copy room link"
            >
              <span className="font-mono text-xs font-semibold tracking-[0.2em] text-text-primary">
                {roomCode}
              </span>
              <Copy className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        )}
        {connecting && (
          <span className="flex items-center gap-1.5 text-xs text-accent-amber">
            <Wifi className="h-3.5 w-3.5 animate-pulse" />
            Connecting…
          </span>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Layout switcher */}
        {layouts.length > 0 && (
          <div className="relative hidden lg:block" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowLayoutMenu((v) => !v)}
              className="btn-ghost h-8 px-2.5 gap-1.5 text-xs"
              aria-label="Change layout"
              aria-haspopup="true"
              aria-expanded={showLayoutMenu}
              title="Change layout"
            >
              {currentLayout?.Icon && <currentLayout.Icon className="h-3.5 w-3.5" />}
              <span className="hidden xl:inline">{currentLayout?.label}</span>
            </button>

            {showLayoutMenu && (
              <div
                className="panel-elevated absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-lg p-1"
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
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-app-hover"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: activeLayout === layout.id ? '#3B82F6' : '#545769' }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-text-primary">{layout.label}</span>
                        <span className="block text-[11px] text-text-muted">{layout.hint}</span>
                      </span>
                      {activeLayout === layout.id && (
                        <Check className="h-3.5 w-3.5 text-accent-blue shrink-0" />
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
          <button
            type="button"
            onClick={onLeaveRoom}
            className="btn-ghost h-8 px-2.5 text-xs gap-1.5"
            style={{ color: '#FCA5A5' }}
            aria-label="Leave room"
            title="Leave room"
          >
            <span className="hidden sm:inline">Leave</span>
          </button>
        )}

        {/* Theme */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn-icon h-8 w-8"
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark'
            ? <Sun  className="h-3.5 w-3.5" />
            : <Moon className="h-3.5 w-3.5" />
          }
        </button>
      </div>
    </header>
  )
}
