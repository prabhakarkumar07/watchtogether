import { AlertTriangle, ExternalLink, Maximize, Minimize } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function ExternalLinkEngine({ url, onReady }) {
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    onReady?.()
  }, [onReady])

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  let domain = 'this website'
  try {
    domain = new URL(url).hostname.replace(/^www./, '')
  } catch {
    // ignore invalid display URL; parsing is handled before this component renders
  }

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col overflow-hidden rounded-lg bg-black">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.04] px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <div className="flex shrink-0 gap-1.5" aria-hidden="true">
            <div className="h-3 w-3 rounded-full bg-marquee-coral/50" />
            <div className="h-3 w-3 rounded-full bg-marquee-amber/50" />
            <div className="h-3 w-3 rounded-full bg-marquee-live/50" />
          </div>
          <div className="max-w-[160px] truncate rounded-md border border-white/5 bg-black/40 px-3 py-1 text-xs text-white/60 sm:max-w-[400px]">
            {url}
          </div>
        </div>

        <div className="ml-3 flex shrink-0 items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-void transition-colors hover:bg-white/90" title="Open in a new tab">
            <span className="hidden sm:inline">Open</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <button type="button" onClick={toggleFullscreen} className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-b border-marquee-amber/20 bg-marquee-amber/10 px-3 py-1.5 text-[11px] text-marquee-amber sm:px-4">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span className="truncate">If the embed is blank, open {domain} in a new tab. Some services block embedded playback.</span>
      </div>

      <div className="relative flex-1 bg-[#0a0a0a]">
        <iframe
          src={url}
          className="absolute inset-0 h-full w-full border-none"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-popups allow-forms"
          title={'Embedded browser for ' + domain}
        />
      </div>
    </div>
  )
}
