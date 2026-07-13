import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Settings2, BellOff, Bell } from 'lucide-react'

const EFFECTS_LIST = [
  { id: 'confetti', icon: '🎊', name: 'Confetti' },
  { id: 'hearts', icon: '❤️', name: 'Hearts' },
  { id: 'likes', icon: '👍', name: 'Likes' },
  { id: 'emojis', icon: '😂', name: 'Laugh' },
  { id: 'fire', icon: '🔥', name: 'Fire' },
  { id: 'sparkles', icon: '✨', name: 'Sparkles' },
  { id: 'stars', icon: '⭐', name: 'Stars' },
  { id: 'petals', icon: '🌸', name: 'Petals' },
  { id: 'balloons', icon: '🎈', name: 'Balloons' },
  { id: 'snow', icon: '❄️', name: 'Snow' },
  { id: 'rain', icon: '🌧️', name: 'Rain' },
  { id: 'partypopper', icon: '🎉', name: 'Party' },
]

export default function EffectsPicker({ sendEffect }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [lastEffect, setLastEffect] = useState('confetti')
  const menuRef = useRef(null)

  useEffect(() => {
    setIsDisabled(localStorage.getItem('disableEffects') === 'true')
    const saved = localStorage.getItem('lastEffect')
    if (saved) setLastEffect(saved)

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDisabled = () => {
    const next = !isDisabled
    setIsDisabled(next)
    localStorage.setItem('disableEffects', next.toString())
  }

  const triggerEffect = (id) => {
    setLastEffect(id)
    localStorage.setItem('lastEffect', id)
    sendEffect(id)
    // Optional: Keep menu open so they can spam it, or close it. 
    // Usually for reactions, keeping it open is fun.
  }

  const handleFabClick = () => {
    if (isOpen) {
      // If already open, maybe trigger last effect again or just close? 
      // Let's close it if clicking the main FAB when open.
      setIsOpen(false)
    } else {
      setIsOpen(true)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={menuRef}>
      {/* Menu Popup */}
      <div
        className={`absolute bottom-16 right-0 mb-2 w-72 origin-bottom-right rounded-xl border border-app-border panel-elevated shadow-2xl transition-all duration-200 ${
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        }`}
        style={{ backgroundColor: '#0C0D13' }}
      >
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text-primary">Celebrations</h3>
          <button
            onClick={toggleDisabled}
            className="text-text-muted hover:text-white transition-colors"
            title={isDisabled ? 'Enable incoming effects' : 'Mute incoming effects'}
            aria-label="Toggle effects"
          >
            {isDisabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 p-3">
          {EFFECTS_LIST.map((effect) => (
            <button
              key={effect.id}
              onClick={() => triggerEffect(effect.id)}
              disabled={isDisabled}
              className={`flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors ${
                isDisabled 
                  ? 'opacity-50 cursor-not-allowed grayscale' 
                  : 'hover:bg-app-hover active:scale-95'
              }`}
              style={lastEffect === effect.id && !isDisabled ? { backgroundColor: 'rgba(59,130,246,0.1)' } : {}}
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

      {/* FAB */}
      <button
        onClick={handleFabClick}
        className="group flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          border: '2px solid rgba(255,255,255,0.1)'
        }}
        aria-label="Theme and Effects"
      >
        <Sparkles className="h-6 w-6 text-white" />
        
        {/* Quick trigger for last effect on right click maybe? Or just keep simple */}
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] shadow-sm">
          {EFFECTS_LIST.find(e => e.id === lastEffect)?.icon || '🎊'}
        </span>
      </button>
    </div>
  )
}
