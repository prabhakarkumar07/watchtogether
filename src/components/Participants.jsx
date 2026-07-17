import React, { useState } from 'react'
import { Crown, Hand, Lock, MicOff, Unlock, Users } from 'lucide-react'
import Tooltip from './Tooltip.jsx'

const AVATAR_PALETTE = [
  { bg: '#4a3514', text: '#FFB627' },
  { bg: '#4a1414', text: '#FF4747' },
  { bg: '#2a2620', text: '#d6c7b3' },
  { bg: '#263318', text: '#a6db65' },
  { bg: '#14363d', text: '#63c9db' },
]

function colorFor(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function Avatar({ id, name, size = 28 }) {
  const color = colorFor(id)
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md font-semibold select-none"
      style={{
        width:           size,
        height:          size,
        fontSize:        size * 0.38,
        backgroundColor: color.bg,
        color:           color.text,
      }}
      aria-hidden="true"
    >
      {name?.slice(0, 1).toUpperCase() || '?'}
    </span>
  )
}

const ParticipantItem = React.memo(function ParticipantItem({ p, selfId, isHandRaised }) {
  return (
    <li
      className="group flex items-center gap-2 rounded px-1.5 py-1 transition-colors"
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#161820'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
    >
      <Avatar id={p.id} name={p.name} size={22} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium text-text-primary">
          {p.name}
          {p.id === selfId && (
            <span className="ml-1 text-text-muted font-normal">(you)</span>
          )}
        </span>
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {isHandRaised && (
          <Tooltip content="Hand raised" position="left">
            <Hand className="h-3.5 w-3.5 text-accent-blue" />
          </Tooltip>
        )}
        {p.isHost && (
          <Tooltip content="Room host" position="left">
            <Crown className="h-3.5 w-3.5 text-accent-amber" />
          </Tooltip>
        )}
      </div>
    </li>
  )
})

export default React.memo(function Participants({ 
  participants, 
  selfId,
  isHost,
  roomLocked,
  onToggleLock,
  onMuteAll,
  raisedHands = new Set()
}) {
  const [showAll, setShowAll] = useState(false)
  
  const MAX_VISIBLE = 20
  const displayedParticipants = showAll ? participants : participants.slice(0, MAX_VISIBLE)
  const hiddenCount = participants.length - displayedParticipants.length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="section-header justify-between pr-2">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>Participants</span>
          <span
            className="font-mono text-[10px] rounded px-1.5 py-0.5 ml-1"
            style={{ backgroundColor: '#161820', color: '#545769' }}
          >
            {participants.length}
          </span>
        </div>
        
        {isHost && (
          <div className="flex items-center gap-1">
            <Tooltip content="Mute all guests" position="left">
              <button 
                onClick={onMuteAll}
                className="btn-ghost h-6 w-6 p-0 flex items-center justify-center text-status-error hover:text-red-400"
              >
                <MicOff className="h-3 w-3" />
              </button>
            </Tooltip>
            <Tooltip content={roomLocked ? "Unlock room" : "Lock room"} position="left">
              <button 
                onClick={onToggleLock}
                className="btn-ghost h-6 w-6 p-0 flex items-center justify-center"
              >
                {roomLocked ? <Lock className="h-3 w-3 text-status-error" /> : <Unlock className="h-3 w-3 text-text-muted" />}
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* List */}
      <ul className="flex flex-col p-1.5 overflow-y-auto sidebar-scroll flex-1">
        {participants.length === 0 && (
          <li className="py-3 text-center text-[11px] text-text-muted">
            No one here yet.
          </li>
        )}
        {displayedParticipants.map((p) => (
          <ParticipantItem key={p.id} p={p} selfId={selfId} isHandRaised={raisedHands.has(p.id)} />
        ))}
        {!showAll && hiddenCount > 0 && (
          <li className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-[11px] font-medium text-accent-blue hover:text-blue-400"
            >
              Show {hiddenCount} more
            </button>
          </li>
        )}
      </ul>
    </div>
  )
})
