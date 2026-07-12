import { Clapperboard, Moon, Sun, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'

export default function Header({ 
  theme, 
  onToggleTheme,
  leftPanelOpen,
  onToggleLeftPanel,
  rightPanelOpen,
  onToggleRightPanel
}) {
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
        <button
          onClick={onToggleLeftPanel}
          className="btn-icon hidden lg:flex"
          aria-label={leftPanelOpen ? 'Hide left panel' : 'Show left panel'}
          title={leftPanelOpen ? 'Hide left panel' : 'Show left panel'}
        >
          {leftPanelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>

        <button
          onClick={onToggleTheme}
          className="btn-icon"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={onToggleRightPanel}
          className="btn-icon hidden lg:flex"
          aria-label={rightPanelOpen ? 'Hide right panel' : 'Show right panel'}
          title={rightPanelOpen ? 'Hide right panel' : 'Show right panel'}
        >
          {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>
    </header>
  )
}
