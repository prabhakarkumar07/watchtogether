import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, Smile } from 'lucide-react'

const QUICK_EMOJI = ['😀', '😂', '😍', '👍', '🎉', '🍿', '😮', '😢', '🔥', '❤️', '😅', '👏']

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function Chat({ messages, onSend, selfName }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!text.trim()) return
    onSend(text)
    setText('')
    setShowEmoji(false)
  }

  return (
    <div className="glass-panel flex min-h-0 flex-1 flex-col p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
        <MessageCircle className="h-3.5 w-3.5" />
        Chat
      </h2>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-ink-faint">No messages yet — say hi 👋</p>
        )}
        {messages.map((m) =>
          m.system ? (
            <p key={m.id} className="animate-float-in text-center text-xs italic text-ink-faint">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className={`animate-float-in flex flex-col ${m.sender === selfName ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 px-1">
                <span className="text-xs font-semibold text-ink-muted">{m.sender}</span>
                <span className="font-mono text-[10px] text-ink-faint">{formatClock(m.timestamp)}</span>
              </div>
              <p
                className={`mt-0.5 max-w-[85%] break-words rounded-2xl px-3.5 py-2 text-sm ${
                  m.sender === selfName
                    ? 'bg-gradient-to-br from-marquee-violet to-purple-700 text-white'
                    : 'glass text-ink'
                }`}
              >
                {m.text}
              </p>
            </div>
          )
        )}
      </div>

      <div className="relative mt-3 flex items-center gap-2">
        {showEmoji && (
          <div className="glass absolute bottom-12 left-0 z-10 grid grid-cols-6 gap-1 rounded-xl p-2">
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setText((t) => t + emoji)
                  setShowEmoji(false)
                }}
                className="rounded-lg p-1.5 text-lg transition-colors hover:bg-white/10"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="btn-icon shrink-0"
          aria-label="Insert emoji"
          aria-expanded={showEmoji}
        >
          <Smile className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          maxLength={500}
          className="input-field flex-1"
          aria-label="Chat message"
        />
        <button onClick={handleSend} className="btn-icon shrink-0" aria-label="Send message">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
