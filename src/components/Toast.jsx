import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const STYLES = {
  success: { icon: CheckCircle2, ring: 'border-marquee-live/30', iconColor: 'text-marquee-live' },
  error: { icon: XCircle, ring: 'border-marquee-coral/30', iconColor: 'text-marquee-coral' },
  warning: { icon: AlertTriangle, ring: 'border-marquee-amber/30', iconColor: 'text-marquee-amber' },
  info: { icon: Info, ring: 'border-marquee-violet/30', iconColor: 'text-marquee-violet' },
}

export default function Toast({ message, type = 'info', onDismiss }) {
  const { icon: Icon, ring, iconColor } = STYLES[type] || STYLES.info

  return (
    <div
      role="status"
      className={`glass pointer-events-auto flex animate-slide-in items-start gap-3 rounded-xl border ${ring} p-3.5 pr-2`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} aria-hidden="true" />
      <p className="flex-1 text-sm leading-snug text-ink">{message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-full p-1 text-ink-faint transition-colors hover:bg-white/10 hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
