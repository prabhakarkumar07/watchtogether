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

export default function Participants({ participants, selfId }) {
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
      <ul className="flex flex-col gap-0.5 p-2 overflow-y-auto sidebar-scroll flex-1">
        {participants.length === 0 && (
          <li className="py-4 text-center text-xs text-text-muted">
            No one here yet.
          </li>
        )}
        {participants.map((p) => (
          <li
            key={p.id}
            className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors"
            style={{ ':hover': { backgroundColor: '#161820' } }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#161820'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
          >
            <Avatar id={p.id} name={p.name} size={28} />

            {/* Name */}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-text-primary">
                {p.name}
                {p.id === selfId && (
                  <span className="ml-1.5 text-text-muted font-normal">(you)</span>
                )}
              </span>
            </span>

            {/* Status icons */}
            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
              {p.isHost && (
                <span title="Room host">
                  <Crown className="h-3 w-3 text-accent-amber" />
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
