import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Send, Smile } from 'lucide-react'

const QUICK_EMOJI = ['\u{1F600}', '\u{1F602}', '\u{1F60D}', '\u{1F44D}', '\u{1F389}', '\u{1F37F}', '\u{1F62E}', '\u{1F622}', '\u{1F525}', '\u{2764}\u{FE0F}', '\u{1F605}', '\u{1F44F}']
const MAX_MESSAGE_LENGTH = 500

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function groupMessages(messages) {
  return messages.map((message, index) => {
    const previous = messages[index - 1]
    const grouped =
      previous &&
      !message.system &&
      !previous.system &&
      previous.sender === message.sender &&
      message.timestamp - previous.timestamp < 90_000
    return { ...message, grouped }
  })
}

export default function Chat({ messages, onSend, selfName }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const scrollRef = useRef(null)
  const groupedMessages = useMemo(() => groupMessages(messages), [messages])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (distanceFromBottom < 180) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    setShowEmoji(false)
  }

  const remaining = MAX_MESSAGE_LENGTH - text.length

  return (
    <section className="glass-panel flex min-h-0 flex-1 flex-col p-4 sm:p-5" aria-label="Room chat">
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-marquee-live" aria-hidden="true" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">Chat</h2>
        <span className="ml-auto rounded-md border border-white/10 px-2 py-0.5 text-xs text-ink-faint">
          {messages.length}
        </span>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="mt-6 rounded-lg border border-dashed border-white/10 px-4 py-5 text-center text-sm text-ink-faint">
            No messages yet. Say hi when everyone is settled in.
          </div>
        )}
        {groupedMessages.map((m) =>
          m.system ? (
            <p key={m.id} className="animate-float-in text-center text-xs italic text-ink-faint">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className={
              'animate-float-in flex flex-col ' + (m.sender === selfName ? 'items-end' : 'items-start')
            }>
              {!m.grouped && (
                <div className="flex items-baseline gap-2 px-1">
                  <span className="text-xs font-semibold text-ink-muted">{m.sender}</span>
                  <time className="font-mono text-[10px] text-ink-faint" dateTime={new Date(m.timestamp).toISOString()}>
                    {formatClock(m.timestamp)}
                  </time>
                </div>
              )}
              <p
                className={
                  'mt-0.5 max-w-[85%] break-words rounded-lg px-3.5 py-2 text-sm leading-relaxed ' +
                  (m.sender === selfName
                    ? 'bg-white text-void shadow-sm'
                    : 'border border-white/10 bg-white/[0.04] text-ink')
                }
              >
                {m.text}
              </p>
            </div>
          )
        )}
      </div>

      <div className="relative mt-3 flex items-center gap-2">
        {showEmoji && (
          <div className="glass absolute bottom-12 left-0 z-10 grid grid-cols-6 gap-1 rounded-lg p-2" role="menu">
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setText((t) => (t + emoji).slice(0, MAX_MESSAGE_LENGTH))
                  setShowEmoji(false)
                }}
                className="rounded-md p-1.5 text-lg transition-colors hover:bg-white/10"
                aria-label={'Insert ' + emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="btn-icon shrink-0"
          aria-label="Insert emoji"
          aria-expanded={showEmoji}
        >
          <Smile className="h-4 w-4" />
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            maxLength={MAX_MESSAGE_LENGTH}
            className="input-field pr-12"
            aria-label="Chat message"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-faint">
            {remaining}
          </span>
        </div>
        <button type="button" onClick={handleSend} disabled={!text.trim()} className="btn-icon shrink-0" aria-label="Send message">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
