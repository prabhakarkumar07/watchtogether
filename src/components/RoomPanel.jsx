import { useEffect, useState } from 'react'
import { Copy, DoorOpen, Loader2, LogOut, Ticket, User } from 'lucide-react'

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
  const [pendingAction, setPendingAction] = useState(null)

  const connecting = status === 'connecting'
  const connected = status === 'connected'
  const canSubmit = username.trim().length > 0 && !connecting

  useEffect(() => {
    if (!connecting) setPendingAction(null)
  }, [connecting])

  const handleCreate = () => {
    setPendingAction('create')
    onCreateRoom()
  }

  const handleJoin = (code) => {
    setPendingAction('join')
    onJoinRoom(code)
  }

  return (
    <section className="glass-panel flex flex-col gap-4 p-4" aria-label="Room controls">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Room</h2>
          <p className="text-xs text-slate-500">Create a private session or join by code.</p>
        </div>
        <span className="status-pill capitalize">
          <span className={'h-1.5 w-1.5 rounded-full ' + (connected ? 'bg-emerald-400' : connecting ? 'bg-amber-300' : 'bg-slate-500')} />
          {status}
        </span>
      </div>

      {!connected ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Display name</span>
            <span className="relative block">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                placeholder="Your name"
                maxLength={24}
                className="input-field pl-9"
                disabled={connecting}
                autoComplete="name"
              />
            </span>
          </label>

          <button type="button" onClick={handleCreate} disabled={!canSubmit} className="btn-primary w-full">
            {connecting && pendingAction === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
            {connecting && pendingAction === 'create' ? 'Creating room...' : 'Create room'}
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500" aria-hidden="true">
            <div className="h-px flex-1 bg-white/10" />
            or
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-slate-400">Room code</span>
            <span className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin(joinCode)}
                placeholder="ABC123"
                maxLength={8}
                className="input-field flex-1 font-mono uppercase tracking-widest"
                aria-label="Room code"
                disabled={connecting}
                autoComplete="off"
                inputMode="text"
              />
              <button type="button" onClick={() => handleJoin(joinCode)} disabled={!canSubmit || !joinCode.trim()} className="btn-secondary shrink-0">
                {connecting && pendingAction === 'join' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}
              </button>
            </span>
          </label>
        </>
      ) : (
        <>
          <div className="ticket-chip rounded-lg border border-white/10 bg-black/20 px-4 py-3">
            <div className="flex items-center gap-3">
              <Ticket className="h-4 w-4 text-amber-300" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Room code</p>
                <p className="font-mono text-xl font-semibold tracking-[0.22em] text-slate-50">{roomCode}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button type="button" onClick={onCopyLink} className="btn-secondary">
              <Copy className="h-4 w-4" />
              Copy link
            </button>
            <button type="button" onClick={onLeaveRoom} className="btn-icon text-red-300 hover:bg-red-500/15" title="Leave room" aria-label="Leave room">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </section>
  )
}
