import { Clapperboard, Moon, Sun, Layout, Check } from 'lucide-react'
import { useState } from 'react'

export default function Header({ 
  theme, 
  onToggleTheme,
  activeLayout,
  setActiveLayout
}) {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  return (
    <header className="glass sticky top-0 z-30 flex items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-marquee-violet to-purple-700 shadow-glow">
          <Clapperboard className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-lg font-semibold leading-none text-ink">Watch Together</h1>
          <div className="marquee-strip mt-1.5" aria-hidden="true">
            <span style={{ animationDelay: '0s' }} />
            <span style={{ animationDelay: '0.3s' }} />
            <span style={{ animationDelay: '0.6s' }} />
            <span style={{ animationDelay: '0.9s' }} />
            <span style={{ animationDelay: '1.2s' }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden lg:block">
          <button
            onClick={() => setShowLayoutMenu((v) => !v)}
            className={`btn-icon ${showLayoutMenu ? 'bg-white/10' : ''}`}
            aria-label="Change layout"
            title="Change layout"
          >
            <Layout className="h-4 w-4" />
          </button>
          
          {showLayoutMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLayoutMenu(false)} />
              <div className="glass absolute right-0 top-full mt-2 z-50 flex w-40 flex-col overflow-hidden rounded-xl p-1 shadow-lg">
                {[
                  { id: 'classic', label: 'Classic View' },
                  { id: 'theater', label: 'Theater Mode' },
                  { id: 'focus', label: 'Focus Mode' },
                  { id: 'overlay', label: 'Overlay Mode' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setActiveLayout(mode.id)
                      setShowLayoutMenu(false)
                    }}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/10 text-left ${activeLayout === mode.id ? 'text-marquee-amber font-medium' : 'text-white/90'}`}
                  >
                    {mode.label}
                    {activeLayout === mode.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onToggleTheme}
          className="btn-icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
