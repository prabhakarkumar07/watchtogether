import { useState } from 'react'
import { Copy, DoorOpen, LogOut, Ticket, User, Loader2 } from 'lucide-react'

export default function RoomPanel({
  username,
  onUsernameChange,
  status,
  roomCode,
  initialJoinCode,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onCopyLink,
}) {
  const [joinCode, setJoinCode] = useState(initialJoinCode || '')
  const connecting = status === 'connecting'
  const connected = status === 'connected'

  return (
    <div className="glass-panel flex flex-col gap-4 p-4 sm:p-5">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">Room</h2>

      {!connected ? (
        <>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Your name"
              maxLength={24}
              className="input-field pl-9"
              aria-label="Username"
              disabled={connecting}
            />
          </div>

          <button onClick={onCreateRoom} disabled={connecting} className="btn-primary w-full">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
            Create Room
          </button>

          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <div className="h-px flex-1 bg-white/10" />
            or join one
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && onJoinRoom(joinCode)}
              placeholder="Room code"
              maxLength={8}
              className="input-field flex-1 font-mono uppercase tracking-widest"
              aria-label="Room code"
              disabled={connecting}
            />
            <button
              onClick={() => onJoinRoom(joinCode)}
              disabled={connecting}
              className="btn-secondary shrink-0"
            >
              Join
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="ticket-chip glass flex flex-1 items-center gap-2 rounded-xl px-4 py-3">
              <Ticket className="h-4 w-4 text-marquee-amber" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint">Room code</p>
                <p className="font-mono text-lg font-semibold tracking-[0.2em] text-ink">{roomCode}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onCopyLink} className="btn-secondary flex-1">
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
            <button onClick={onLeaveRoom} className="btn-secondary shrink-0 !text-marquee-coral">
              <LogOut className="h-4 w-4" />
              Leave
            </button>
          </div>
        </>
      )}
    </div>
  )
}
