import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Film,
  Gauge,
  Link as LinkIcon,
  Maximize,
  Minimize,
  Monitor,
  MonitorOff,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import NativeVideoEngine   from './players/NativeVideoEngine.jsx'
import YouTubeEngine       from './players/YouTubeEngine.jsx'
import VimeoEngine         from './players/VimeoEngine.jsx'
import ScreenShareEngine   from './players/ScreenShareEngine.jsx'
import ExternalLinkEngine  from './players/ExternalLinkEngine.jsx'
import { parseVideoUrl, parseVideoUrlSync } from '../lib/videoParsers.js'

const ReactPlayerEngine = lazy(() => import('./players/ReactPlayerEngine.jsx'))

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const DRIFT_TOLERANCE_SECONDS = 1.5

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h  = Math.floor(seconds / 3600)
  const m  = Math.floor((seconds % 3600) / 60)
  const s  = Math.floor(seconds % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export default function VideoPlayer({
  videoState,
  onLoadVideo,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
  recentVideos,
  savedVolume,
  savedSpeed,
  onVolumeChange,
  incomingStream,
  outgoingStream,
  onStartScreenShare,
  onStopScreenShare,
}) {
  const [urlInput, setUrlInput]         = useState('')
  const [loadError, setLoadError]       = useState('')
  const [isLoading, setIsLoading]       = useState(false)
  const [ready, setReady]               = useState(false)

  const [localTime, setLocalTime]       = useState(0)
  const [localDuration, setLocalDuration] = useState(0)
  const [localPlaying, setLocalPlaying] = useState(false)
  const [seekPreview, setSeekPreview]   = useState(null)
  const [volume, setVolume]             = useState(savedVolume ?? 0.8)
  const [mutedPrevVolume, setMutedPrevVolume] = useState(null)
  const [speed, setSpeedState]          = useState(savedSpeed ?? 1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  const engineRef   = useRef(null)
  const containerRef = useRef(null)
  const pollRef     = useRef(null)

  const source       = videoState?.source || null
  const isScreenShare = source?.type === 'screenshare'
  const engineKey    = source
    ? (isScreenShare ? 'screenshare' : `${source.type}-${source.id}`)
    : 'empty'

  /* ── Load video ─────────────────────────────────────────────────────── */

  const handleLoadClick = useCallback(() => {
    if (!urlInput.trim()) return
    const parsed = parseVideoUrl(urlInput)
    if (parsed.type === 'unsupported') { setLoadError(parsed.reason); return }
    setLoadError('')
    setIsLoading(true)
    setReady(false)
    onLoadVideo(parsed)
  }, [urlInput, onLoadVideo])

  const handlePickRecent = useCallback((url) => {
    setUrlInput(url)
    const parsed = parseVideoUrlSync(url)
    if (parsed.type === 'unsupported') { setLoadError(parsed.reason); return }
    setLoadError('')
    setIsLoading(true)
    setReady(false)
    onLoadVideo(parsed)
  }, [onLoadVideo])

  useEffect(() => {
    if (!source || isScreenShare) return
    setIsLoading(true)
    setReady(false)
    setLocalPlaying(false)
    setLocalTime(0)
    setLocalDuration(0)
    setSeekPreview(null)
  }, [engineKey]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Polling ────────────────────────────────────────────────────────── */

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      if (!engineRef.current || seekPreview !== null) return
      const [time, duration] = await Promise.all([
        engineRef.current.getCurrentTime(),
        engineRef.current.getDuration(),
      ])
      setLocalTime(time || 0)
      setLocalDuration(duration || 0)
    }, 250)
    return () => clearInterval(pollRef.current)
  }, [seekPreview, source])

  /* ── Drift correction ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!videoState?.source || videoState.source.type === 'screenshare' || !engineRef.current || !ready) return
    let cancelled = false
    ;(async () => {
      const engine = engineRef.current
      const target = videoState.isPlaying
        ? videoState.time + (Date.now() - videoState.updatedAt) / 1000 * videoState.playbackRate
        : videoState.time
      const current = await engine.getCurrentTime()
      if (cancelled) return
      if (Math.abs(current - target) > DRIFT_TOLERANCE_SECONDS) engine.seekTo(Math.max(target, 0))
      if (videoState.isPlaying && !localPlaying) engine.play()
      if (!videoState.isPlaying && localPlaying) engine.pause()
      if (videoState.playbackRate !== speed) {
        engine.setPlaybackRate(videoState.playbackRate)
        setSpeedState(videoState.playbackRate)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState, ready])

  /* ── Volume + fullscreen ────────────────────────────────────────────── */

  useEffect(() => {
    engineRef.current?.setVolume?.(volume)
    onVolumeChange?.(volume)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, ready])

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  /* ── Playback controls ──────────────────────────────────────────────── */

  const handlePlayPause = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const time = await engine.getCurrentTime()
    if (localPlaying) { engine.pause(); onPause(time) }
    else               { engine.play();  onPlay(time)  }
  }, [localPlaying, onPause, onPlay])

  const commitSeek = useCallback((value) => {
    engineRef.current?.seekTo(value)
    onSeek(value)
    setSeekPreview(null)
  }, [onSeek])

  const handleSpeedPick = useCallback(async (rate) => {
    setSpeedState(rate)
    setShowSpeedMenu(false)
    engineRef.current?.setPlaybackRate(rate)
    const time = (await engineRef.current?.getCurrentTime()) || 0
    onSpeedChange(rate, time)
  }, [onSpeedChange])

  const toggleMute = useCallback(() => {
    if (mutedPrevVolume !== null) {
      setVolume(mutedPrevVolume)
      setMutedPrevVolume(null)
    } else {
      setMutedPrevVolume(volume)
      setVolume(0)
    }
  }, [mutedPrevVolume, volume])

  const displayTime  = seekPreview !== null ? seekPreview : localTime
  const VolumeIcon   = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  /* ── Engine node ────────────────────────────────────────────────────── */

  const engineNode = useMemo(() => {
    if (!source) return null
    const commonProps = {
      onReady:         () => { setIsLoading(false); setReady(true) },
      onError:         (msg) => { setIsLoading(false); setLoadError(msg) },
      onEnded:         () => setLocalPlaying(false),
      onPlayStateChange: (playing) => setLocalPlaying(playing),
    }
    if (source.type === 'youtube')   return <YouTubeEngine    key={engineKey} ref={engineRef} videoId={source.id}  {...commonProps} />
    if (source.type === 'vimeo')     return <VimeoEngine      key={engineKey} ref={engineRef} videoId={source.id}  {...commonProps} />
    if (source.type === 'screenshare') {
      const activeStream = outgoingStream || incomingStream
      const streamKey    = activeStream ? 'screenshare-live' : 'screenshare-waiting'
      return <ScreenShareEngine key={streamKey} stream={activeStream} isLocal={!!outgoingStream} volume={volume} onReady={commonProps.onReady} />
    }
    if (source.type === 'universal') {
      return (
        <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-xs text-text-muted">Loading player…</div>}>
          <ReactPlayerEngine key={engineKey} ref={engineRef} url={source.url} {...commonProps} />
        </Suspense>
      )
    }
    if (source.type === 'external') return <ExternalLinkEngine key={engineKey} url={source.url} onReady={commonProps.onReady} />
    return <NativeVideoEngine key={engineKey} ref={engineRef} url={source.url} {...commonProps} />
  }, [source, engineKey, incomingStream, outgoingStream, volume])

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    /*
     * Full-height flex column. The video player fills all available vertical
     * space. No overflow-y here — parent layout manages the fixed viewport.
     */
    <div
      className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden"
      style={{ backgroundColor: '#090A0F' }}
    >
      {/* ── Toolbar (URL input) ─────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-1.5 px-2 py-1.5 border-b border-app-border shrink-0"
        style={{ backgroundColor: '#0C0D13' }}
      >
        <div className="flex gap-2">
          {/* URL input */}
          <div className="relative flex-1">
            <LinkIcon
              className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLoadClick()}
              placeholder="YouTube, Vimeo, MP4, M3U8…"
              className="input-field pl-7 h-7 text-[12px]"
              aria-label="Video URL"
            />
          </div>

          {/* Load */}
          <button
            type="button"
            onClick={handleLoadClick}
            disabled={isLoading || !urlInput.trim()}
            className="btn-primary h-7 shrink-0 gap-1 text-[11px]"
            aria-label="Load video"
          >
            <Film className="h-3 w-3" />
            Load
          </button>

          {/* Screen share */}
          {outgoingStream ? (
            <button
              type="button"
              onClick={onStopScreenShare}
              className="btn-icon h-7 w-auto px-2 gap-1 text-[11px]"
              style={{ color: '#FCA5A5', backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)' }}
              aria-label="Stop sharing screen"
            >
              <MonitorOff className="h-3 w-3" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartScreenShare}
              className="btn-secondary h-7 w-auto px-2 gap-1 text-[11px]"
              aria-label="Share screen"
            >
              <Monitor className="h-3 w-3" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
        </div>

        {/* Recent videos */}
        {recentVideos?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recentVideos.slice(0, 4).map((url) => (
              <button
                key={url}
                onClick={() => handlePickRecent(url)}
                className="max-w-[180px] truncate rounded px-2 py-0.5 text-[11px] transition-colors"
                style={{
                  backgroundColor: '#161820',
                  color:           '#8B8FA8',
                  border:          '1px solid #2A2D3A',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#E8E9F0'; e.currentTarget.style.borderColor = '#3A3D4D' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#8B8FA8'; e.currentTarget.style.borderColor = '#2A2D3A' }}
                title={url}
              >
                {url.replace(/^https?:\/\//, '')}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {loadError && (
          <div
            className="rounded-md px-3 py-2 text-xs"
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              border:          '1px solid rgba(239,68,68,0.25)',
              color:           '#FCA5A5',
            }}
          >
            {loadError}
          </div>
        )}
      </div>

      {/* ── Player surface ──────────────────────────────────────────────── */}
      {/*
       * flex-1 + min-h-0: fills remaining vertical space.
       * The `ref={containerRef}` wraps this for fullscreen.
       */}
      <div
        ref={containerRef}
        className={`group relative flex flex-1 min-h-0 min-w-0 items-center justify-center overflow-hidden bg-black ${
          isFullscreen ? 'fixed inset-0 z-50' : ''
        }`}
      >
        {/* Empty state */}
        {!source && (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: '#161820', border: '1px solid #2A2D3A' }}
            >
              <Film className="h-8 w-8 text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">No video loaded</p>
              <p className="text-xs text-text-muted mt-0.5">
                Paste a video link above and press Load.
              </p>
            </div>
          </div>
        )}

        {/* Engine */}
        {source && (
          <>
            {engineNode}

            {/* Loading spinner */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2"
                  style={{ borderColor: '#2A2D3A', borderTopColor: '#3B82F6' }}
                />
              </div>
            )}

            {/* ── Screen share controls ── */}
            {source.type === 'screenshare' && (
              <div
                className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 pb-3 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="btn-icon h-8 w-8"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                    aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    <VolumeIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min={0} max={1} step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="h-1 w-20 cursor-pointer appearance-none rounded-full accent-accent-blue"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                    aria-label="Volume"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {outgoingStream && (
                    <button
                      onClick={onStopScreenShare}
                      className="btn-icon h-8 w-auto px-3 text-xs gap-1.5"
                      style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}
                      aria-label="Stop sharing"
                    >
                      Stop sharing
                    </button>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="btn-icon h-8 w-8"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* ── Standard video controls ── */}
            {source.type !== 'screenshare' && source.type !== 'external' && (
              <div
                className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 px-3 pb-3 pt-10 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }}
              >
                {/* Seek bar */}
                <input
                  type="range"
                  min={0}
                  max={localDuration || 0}
                  step={0.1}
                  value={Math.min(displayTime, localDuration || 0)}
                  onChange={(e) => setSeekPreview(Number(e.target.value))}
                  onMouseUp={(e) => commitSeek(Number(e.target.value))}
                  onTouchEnd={(e) => commitSeek(Number(e.target.value))}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') commitSeek(Number(e.target.value))
                  }}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full accent-accent-blue"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  aria-label="Seek"
                />

                {/* Controls row */}
                <div className="flex items-center gap-2">
                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    className="btn-icon h-8 w-8 shrink-0"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: 'white' }}
                    aria-label={localPlaying ? 'Pause' : 'Play'}
                  >
                    {localPlaying
                      ? <Pause className="h-4 w-4" />
                      : <Play  className="h-4 w-4 pl-0.5" />
                    }
                  </button>

                  {/* Time */}
                  <span className="font-mono text-xs text-white/80 tabular-nums whitespace-nowrap">
                    {formatTime(displayTime)} / {formatTime(localDuration)}
                  </span>

                  {/* Right controls */}
                  <div className="ml-auto flex items-center gap-1.5">
                    {/* Volume */}
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <button
                        onClick={toggleMute}
                        className="btn-icon h-7 w-7"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                        aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                      >
                        <VolumeIcon className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="range"
                        min={0} max={1} step={0.05}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="h-1 w-20 cursor-pointer appearance-none rounded-full accent-accent-blue"
                        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        aria-label="Volume"
                      />
                    </div>

                    {/* Speed */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedMenu((v) => !v)}
                        className="btn-icon h-7 w-auto px-2 gap-1 text-xs"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                        aria-label="Playback speed"
                        aria-expanded={showSpeedMenu}
                      >
                        <Gauge className="h-3 w-3" />
                        {speed}×
                      </button>
                      {showSpeedMenu && (
                        <div
                          className="panel-elevated absolute bottom-9 right-0 z-20 flex w-20 flex-col overflow-hidden rounded-lg p-1"
                        >
                          {SPEEDS.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSpeedPick(s)}
                              className="rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-app-hover"
                              style={{ color: s === speed ? '#60A5FA' : '#C4C6D6' }}
                            >
                              {s}×
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="btn-icon h-7 w-7"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }}
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen
                        ? <Minimize className="h-3.5 w-3.5" />
                        : <Maximize className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
