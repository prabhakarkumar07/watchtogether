import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Smile } from 'lucide-react'
import Tooltip from './Tooltip.jsx'

const QUICK_EMOJI = ['😀', '😂', '😍', '👍', '🎉', '🍿', '😮', '😢', '🔥', '❤️', '😅', '👏']
const MAX_MESSAGE_LENGTH = 500

function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function Linkify({ text }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) => 
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
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

const AVATAR_PALETTE = [
  { bg: '#4a3514', text: '#FFB627' },
  { bg: '#4a1414', text: '#FF4747' },
  { bg: '#2a2620', text: '#d6c7b3' },
  { bg: '#263318', text: '#a6db65' },
  { bg: '#14363d', text: '#63c9db' },
]

function colorFor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

const ChatMessage = React.memo(function ChatMessage({ m, selfName }) {
  if (m.system) {
    return (
      <p className="animate-float-in text-center text-[11px] text-text-muted py-0.5">
        {m.text}
      </p>
    )
  }

  const isSelf  = m.sender === selfName
  const color   = colorFor(m.sender)

  return (
    <div
      className={`animate-float-in flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'} ${
        m.grouped ? 'mt-0.5' : 'mt-2.5'
      }`}
    >
      {/* Avatar — only shown on first in a group */}
      {!m.grouped ? (
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold self-start mt-0.5"
          style={{ backgroundColor: color.bg, color: color.text }}
          aria-hidden="true"
        >
          {m.sender?.slice(0, 1).toUpperCase() || '?'}
        </div>
      ) : (
        <div className="w-6 shrink-0" aria-hidden="true" />
      )}

      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
        {/* Sender + time — only shown on first in a group */}
        {!m.grouped && (
          <div className="flex items-baseline gap-1.5 mb-0.5 px-0.5">
            <span className="text-[11px] font-semibold text-text-secondary">
              {m.sender}
            </span>
            <time
              className="font-mono text-[10px] text-text-muted"
              dateTime={new Date(m.timestamp).toISOString()}
            >
              {formatClock(m.timestamp)}
            </time>
          </div>
        )}

        {/* Bubble */}
        <Tooltip content={m.grouped ? formatClock(m.timestamp) : null} position="left">
          <div
            className="max-w-[88%] break-words rounded-lg px-3 py-1.5 text-xs leading-relaxed"
            style={
              isSelf
                ? { backgroundColor: '#FFB627', color: '#0A0A0A' }
                : { backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }
            }
          >
            <Linkify text={m.text} />
          </div>
        </Tooltip>
      </div>
    </div>
  )
})

export default React.memo(function Chat({ messages, onSend, selfName, typingNames = [], sendTyping }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const scrollRef = useRef(null)
  const inputRef  = useRef(null)
  const lastTypingRef = useRef(0)
  
  const MAX_VISIBLE_MESSAGES = 80
  const groupedMessages = useMemo(() => {
    const grouped = groupMessages(messages)
    return grouped.slice(-MAX_VISIBLE_MESSAGES)
  }, [messages])

  useEffect(() => {
    // Attempt auto-focus on mount, ignoring errors if mobile keyboards block it
    setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true })
    }, 50)
  }, [])

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    if (distanceFromBottom < 200) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    setShowEmoji(false)
    sendTyping?.(false)
    inputRef.current?.focus()
  }

  const handleTextChange = (val) => {
    setText(val)
    const now = Date.now()
    if (now - lastTypingRef.current > 1500) {
      sendTyping?.(true)
      lastTypingRef.current = now
    }
  }

  const remaining = MAX_MESSAGE_LENGTH - text.length

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Room chat">
      {/* Header */}
      <div className="section-header">
        <span>Chat</span>
        <span
          className="ml-auto font-mono text-[10px] rounded px-1.5 py-0.5"
          style={{ backgroundColor: 'var(--recent-bg)', color: 'var(--text-faint)' }}
        >
          {messages.length}
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex flex-1 min-h-0 flex-col overflow-y-auto p-3 gap-1"
      >
        {messages.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-xs text-text-muted">No messages yet.</p>
            <p className="text-[11px] text-text-muted opacity-60 mt-1">Say hi! 👋</p>
          </div>
        )}

        {groupedMessages.map((m) => (
          <ChatMessage key={m.id} m={m} selfName={selfName} />
        ))}
      </div>

      {/* Input area */}
      <div
        className="p-2.5 border-t border-app-border shrink-0 flex flex-col bg-app-toolbar"
      >
        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <div className="px-1 pb-1.5 text-[10px] text-text-muted italic flex items-center gap-1.5">
            <span className="flex gap-0.5" aria-hidden="true">
              <span className="w-1 h-1 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span className="truncate max-w-[150px]">{typingNames.join(', ')}</span> {typingNames.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        {/* Emoji picker */}
        {showEmoji && (
          <div
            className="panel-elevated mb-2 grid grid-cols-6 gap-0.5 p-2 rounded-lg"
            role="menu"
            aria-label="Quick emoji"
          >
            {QUICK_EMOJI.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setText((t) => (t + emoji).slice(0, MAX_MESSAGE_LENGTH))
                  setShowEmoji(false)
                  inputRef.current?.focus()
                }}
                className="rounded-md p-1.5 text-base transition-colors hover:bg-app-hover"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            className="btn-icon h-8 w-8 shrink-0"
            aria-label="Insert emoji"
            aria-expanded={showEmoji}
          >
            <Smile className="h-3.5 w-3.5" />
          </button>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => handleTextChange(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message…"
              maxLength={MAX_MESSAGE_LENGTH}
              className="input-field h-8"
              aria-label="Chat message"
            />
            {text.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <span
                className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] ${
                  remaining < 50 ? 'text-status-error' : 'text-text-muted'
                }`}
              >
                {remaining}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="btn-icon h-8 w-8 shrink-0"
            style={
              text.trim()
                ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#2563EB' }
                : {}
            }
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  )
})
