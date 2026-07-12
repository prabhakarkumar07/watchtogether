import { ExternalLink, Globe } from 'lucide-react'

export default function ExternalLinkEngine({ url }) {
  // Try to extract hostname for display
  let domain = 'this website'
  try {
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // ignore
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-black/80 to-black/95 backdrop-blur-md">
      <div className="glass-panel relative flex max-w-md flex-col items-center p-8 text-center border border-white/10 shadow-2xl overflow-hidden group">
        
        {/* Subtle background glow effect */}
        <div className="absolute -inset-24 bg-marquee-blue/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-80 transition-opacity duration-1000" />

        <div className="relative z-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-inner">
            <Globe className="h-8 w-8 text-marquee-blue animate-pulse" />
          </div>
          
          <h2 className="mb-2 font-display text-2xl font-bold text-white">External Watch Party</h2>
          
          <p className="mb-8 text-sm text-white/70 leading-relaxed">
            The host has chosen to watch a video on <strong>{domain}</strong>. Because of browser security, we cannot play it directly here.
          </p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full gap-2 py-3 shadow-lg shadow-marquee-blue/20 hover:shadow-marquee-blue/40 transition-all hover:-translate-y-0.5"
          >
            Open in New Tab
            <ExternalLink className="h-4 w-4" />
          </a>

          <p className="mt-6 text-[11px] text-white/40 uppercase tracking-wider font-semibold">
            Use the video call to sync up 🎙️
          </p>
        </div>
      </div>
    </div>
  )
}
