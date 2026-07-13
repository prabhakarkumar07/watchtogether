import { useEffect, useState } from 'react'
import { Copy, DoorOpen, Loader2, LogOut, User } from 'lucide-react'

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
  const connected  = status === 'connected'
  const canSubmit  = username.trim().length > 0 && !connecting

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

  if (connected) {
    return (
      <div className="p-3 border-b border-app-border shrink-0">
        {/* Room code display */}
        <div className="mb-2.5">
          <p className="text-2xs font-semibold uppercase tracking-widest text-text-muted mb-1">
            Room
          </p>
          <div
            className="flex items-center justify-between gap-2 rounded-md px-3 py-2"
            style={{ backgroundColor: '#090A0F', border: '1px solid #2A2D3A' }}
          >
            <span className="font-mono text-sm font-semibold tracking-[0.2em] text-text-primary">
              {roomCode}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onCopyLink}
                className="btn-icon h-6 w-6"
                title="Copy invite link"
                aria-label="Copy invite link"
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={onLeaveRoom}
                className="btn-icon h-6 w-6 text-status-error hover:text-status-error"
                title="Leave room"
                aria-label="Leave room"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 border-b border-app-border shrink-0">
      <div className="mb-3">
        <p className="text-xs font-semibold text-text-primary mb-0.5">Join a Watch Party</p>
        <p className="text-2xs text-text-muted">Create or join a private synchronized room.</p>
      </div>

      {/* Username */}
      <div className="mb-3">
        <label className="block mb-1">
          <span className="text-2xs font-medium text-text-muted uppercase tracking-wide">
            Display name
          </span>
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            className="input-field pl-8"
            disabled={connecting}
            autoComplete="name"
          />
        </div>
      </div>

      {/* Create */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={!canSubmit}
        className="btn-primary w-full mb-3"
        aria-label="Create room"
      >
        {connecting && pendingAction === 'create'
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <DoorOpen className="h-3.5 w-3.5" />
        }
        {connecting && pendingAction === 'create' ? 'Creating…' : 'Create room'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-app-border" />
        <span className="text-2xs text-text-muted">or join existing</span>
        <div className="h-px flex-1 bg-app-border" />
      </div>

      {/* Join by code */}
      <div className="flex gap-2">
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
        <button
          type="button"
          onClick={() => handleJoin(joinCode)}
          disabled={!canSubmit || !joinCode.trim()}
          className="btn-secondary shrink-0"
          aria-label="Join room"
        >
          {connecting && pendingAction === 'join'
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : 'Join'
          }
        </button>
      </div>
    </div>
  )
}
