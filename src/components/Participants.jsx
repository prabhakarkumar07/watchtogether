import { Crown, Users } from 'lucide-react'

const AVATAR_COLORS = [
  'from-marquee-violet to-purple-700',
  'from-marquee-amber to-orange-600',
  'from-marquee-live to-emerald-700',
  'from-marquee-coral to-rose-700',
  'from-sky-500 to-blue-700',
]

function colorFor(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export default function Participants({ participants, selfId }) {
  return (
    <section className="glass-panel flex flex-col gap-3 p-4 sm:p-5" aria-label="Participants">
      <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
        <Users className="h-3.5 w-3.5" />
        Participants
        <span className="ml-auto rounded-md border border-white/10 px-2 py-0.5 text-xs font-medium normal-case text-ink-muted">
          {participants.length}
        </span>
      </h2>

      <ul className="flex flex-col gap-1.5">
        {participants.map((p) => (
          <li key={p.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
            <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-semibold text-white ' + colorFor(p.id)}>
              {p.name?.slice(0, 1).toUpperCase() || '?'}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">
              {p.name}
              {p.id === selfId && <span className="text-ink-faint"> (you)</span>}
            </span>
            {p.isHost && (
              <span className="flex items-center gap-1 rounded-md bg-marquee-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-marquee-amber" title="Room host">
                <Crown className="h-3 w-3" />
                Host
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
