import { ExternalLink, Maximize, Minimize, AlertTriangle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function ExternalLinkEngine({ url }) {
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // ignore
  }

  return (
    <div ref={containerRef} className="absolute inset-0 flex flex-col bg-black rounded-2xl overflow-hidden">
      
      {/* Embedded Browser Toolbar */}
      <div className="flex items-center justify-between bg-white/[0.04] border-b border-white/10 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-marquee-coral/50" />
            <div className="w-3 h-3 rounded-full bg-marquee-amber/50" />
            <div className="w-3 h-3 rounded-full bg-marquee-green/50" />
          </div>
          <div className="bg-black/40 border border-white/5 rounded-md px-3 py-1 text-xs text-white/50 truncate max-w-[200px] sm:max-w-[400px]">
            {url}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-marquee-violet/20 hover:bg-marquee-violet/30 text-marquee-violet text-xs font-medium transition-colors"
            title="Open in New Tab (Use this if the site is blank!)"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-marquee-amber/10 border-b border-marquee-amber/20 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] text-marquee-amber">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span className="truncate">If the area below is blank or shows an error, click "Open in New Tab". Sites like Netflix block embedded browsers.</span>
      </div>

      {/* Iframe Content */}
      <div className="flex-1 relative bg-[#0a0a0a]">
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full border-none"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title={`Embedded browser for ${domain}`}
        />
      </div>

    </div>
  )
}
