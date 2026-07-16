import React, { useEffect, useState } from 'react'
import { Copy, DoorOpen, Loader2, LogOut, User } from 'lucide-react'

export default React.memo(function RoomPanel({
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
            style={{ backgroundColor: 'rgba(74, 53, 20, 0.4)', border: '1px dashed rgba(255, 182, 39, 0.4)' }}
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
    <div className="p-2.5 border-b border-app-border shrink-0">
      <div className="mb-2">
        <p className="text-[11px] font-semibold text-text-primary mb-0.5">Join a Watch Party</p>
        <p className="text-[10px] text-text-muted">Create or join a private synchronized room.</p>
      </div>

      {/* Username */}
      <div className="mb-2">
        <label className="block mb-1">
          <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
            Display name
          </span>
        </label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            className="input-field pl-7 h-7 text-[12px]"
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
        className="btn-primary w-full mb-2 h-7 text-[11px]"
        aria-label="Create room"
      >
        {connecting && pendingAction === 'create'
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <DoorOpen className="h-3 w-3" />
        }
        {connecting && pendingAction === 'create' ? 'Creating…' : 'Create room'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="h-px flex-1 bg-app-border" />
        <span className="text-[10px] text-text-muted">or join existing</span>
        <div className="h-px flex-1 bg-app-border" />
      </div>

      {/* Join by code */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin(joinCode)}
          placeholder="ABC123"
          maxLength={8}
          className="input-field flex-1 font-mono uppercase tracking-widest h-7 text-[12px]"
          aria-label="Room code"
          disabled={connecting}
          autoComplete="off"
          inputMode="text"
        />
        <button
          type="button"
          onClick={() => handleJoin(joinCode)}
          disabled={!canSubmit || !joinCode.trim()}
          className="btn-secondary shrink-0 h-7 text-[11px] px-2.5"
          aria-label="Join room"
        >
          {connecting && pendingAction === 'join'
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : 'Join'
          }
        </button>
      </div>
    </div>
  )
})
