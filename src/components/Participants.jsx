import React, { useState } from 'react'
import { Crown, Mic, MicOff, Users, Video, VideoOff } from 'lucide-react'

const AVATAR_PALETTE = [
  { bg: '#2D1B69', text: '#A78BFA' },
  { bg: '#1A3A2A', text: '#4ADE80' },
  { bg: '#3B1A1A', text: '#FCA5A5' },
  { bg: '#1A2D3B', text: '#60A5FA' },
  { bg: '#2D2B1A', text: '#FCD34D' },
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

const ParticipantItem = React.memo(function ParticipantItem({ p, selfId }) {
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

      <div className="flex items-center gap-1">
        {p.isHost && (
          <span title="Room host">
            <Crown className="h-3 w-3 text-accent-amber" />
          </span>
        )}
      </div>
    </li>
  )
})

export default React.memo(function Participants({ participants, selfId }) {
  const [showAll, setShowAll] = useState(false)
  
  const MAX_VISIBLE = 20
  const displayedParticipants = showAll ? participants : participants.slice(0, MAX_VISIBLE)
  const hiddenCount = participants.length - displayedParticipants.length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="section-header">
        <Users className="h-3 w-3" />
        <span>Participants</span>
        <span
          className="ml-auto font-mono text-[10px] rounded px-1.5 py-0.5"
          style={{ backgroundColor: '#161820', color: '#545769' }}
        >
          {participants.length}
        </span>
      </div>

      {/* List */}
      <ul className="flex flex-col p-1.5 overflow-y-auto sidebar-scroll flex-1">
        {participants.length === 0 && (
          <li className="py-3 text-center text-[11px] text-text-muted">
            No one here yet.
          </li>
        )}
        {displayedParticipants.map((p) => (
          <ParticipantItem key={p.id} p={p} selfId={selfId} />
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
