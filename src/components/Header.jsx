import { Check, Clapperboard, Layout, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const LAYOUTS = [
  { id: 'classic', label: 'Classic', hint: 'Balanced room, video, and chat' },
  { id: 'theater', label: 'Theater', hint: 'Prioritize the shared player' },
  { id: 'focus', label: 'Focus', hint: 'Minimal controls for watching' },
  { id: 'sidebar', label: 'Sidebar', hint: 'Chat beside room controls' },
]

export default function Header({ theme, onToggleTheme, activeLayout, setActiveLayout }) {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!showLayoutMenu) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setShowLayoutMenu(false)
    }
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowLayoutMenu(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [showLayoutMenu])

  const currentLayout = LAYOUTS.find((layout) => layout.id === activeLayout) || LAYOUTS[0]

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0d12]/88 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-950 shadow-sm" aria-hidden="true">
            <Clapperboard className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-50 sm:text-lg">Watch Together</h1>
            <p className="hidden text-xs text-slate-500 sm:block">Private rooms for synchronized watching</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden lg:block" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowLayoutMenu((v) => !v)}
              className="btn-secondary h-9 min-h-9 px-3"
              aria-label="Change layout"
              aria-haspopup="menu"
              aria-expanded={showLayoutMenu}
              title="Change layout"
            >
              <Layout className="h-4 w-4" />
              <span>{currentLayout.label}</span>
            </button>

            {showLayoutMenu && (
              <div className="glass absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg p-1 shadow-lg" role="menu">
                {LAYOUTS.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={activeLayout === mode.id}
                    onClick={() => {
                      setActiveLayout(mode.id)
                      setShowLayoutMenu(false)
                    }}
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded border border-white/15">
                      {activeLayout === mode.id && <Check className="h-3 w-3 text-blue-300" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-100">{mode.label}</span>
                      <span className="block text-xs text-slate-500">{mode.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            className="btn-icon"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  )
}
