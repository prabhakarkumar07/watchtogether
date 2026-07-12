import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Link as LinkIcon,
  Film,
  Gauge,
} from 'lucide-react'
import NativeVideoEngine from './players/NativeVideoEngine.jsx'
import YouTubeEngine from './players/YouTubeEngine.jsx'
import VimeoEngine from './players/VimeoEngine.jsx'
import ScreenShareEngine from './players/ScreenShareEngine.jsx'
import { parseVideoUrl } from '../lib/videoParsers.js'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const DRIFT_TOLERANCE_SECONDS = 1.5

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
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
  const [urlInput, setUrlInput] = useState('')
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ready, setReady] = useState(false)

  const [localTime, setLocalTime] = useState(0)
  const [localDuration, setLocalDuration] = useState(0)
  const [localPlaying, setLocalPlaying] = useState(false)
  const [seekPreview, setSeekPreview] = useState(null)
  const [volume, setVolume] = useState(savedVolume ?? 0.8)
  const [mutedPrevVolume, setMutedPrevVolume] = useState(null)
  const [speed, setSpeedState] = useState(savedSpeed ?? 1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  const engineRef = useRef(null)
  const containerRef = useRef(null)
  const pollRef = useRef(null)

  const source = videoState?.source || null
  const isScreenShare = source?.type === 'screenshare'
  // Give screenshare a deterministic key that doesn't include `id` (which is undefined)
  const engineKey = source ? (isScreenShare ? 'screenshare' : `${source.type}-${source.id}`) : 'empty'

  // ---------- load a new video ----------

  const handleLoadClick = useCallback(() => {
    const parsed = parseVideoUrl(urlInput)
    if (parsed.type === 'unsupported') {
      setLoadError(parsed.reason)
      return
    }
    setLoadError('')
    setIsLoading(true)
    setReady(false)
    onLoadVideo(parsed)
  }, [urlInput, onLoadVideo])

  const handlePickRecent = useCallback(
    (url) => {
      setUrlInput(url)
      const parsed = parseVideoUrl(url)
      if (parsed.type === 'unsupported') {
        setLoadError(parsed.reason)
        return
      }
      setLoadError('')
      setIsLoading(true)
      setReady(false)
      onLoadVideo(parsed)
    },
    [onLoadVideo]
  )

  // When source changes, show loading — except for screenshare which manages its own ready state
  useEffect(() => {
    if (!source || isScreenShare) return
    setIsLoading(true)
    setReady(false)
  }, [engineKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- polling local playback position ----------

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

  // ---------- reconcile with authoritative room state (drift correction) ----------

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

      if (Math.abs(current - target) > DRIFT_TOLERANCE_SECONDS) {
        engine.seekTo(Math.max(target, 0))
      }
      if (videoState.isPlaying && !localPlaying) engine.play()
      if (!videoState.isPlaying && localPlaying) engine.pause()
      if (videoState.playbackRate !== speed) {
        engine.setPlaybackRate(videoState.playbackRate)
        setSpeedState(videoState.playbackRate)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoState, ready])

  // ---------- volume + fullscreen wiring ----------

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

  // ---------- user control handlers ----------

  const handlePlayPause = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const time = await engine.getCurrentTime()
    if (localPlaying) {
      engine.pause()
      onPause(time)
    } else {
      engine.play()
      onPlay(time)
    }
  }, [localPlaying, onPause, onPlay])

  const commitSeek = useCallback(
    (value) => {
      engineRef.current?.seekTo(value)
      onSeek(value)
      setSeekPreview(null)
    },
    [onSeek]
  )

  const handleSpeedPick = useCallback(
    async (rate) => {
      setSpeedState(rate)
      setShowSpeedMenu(false)
      engineRef.current?.setPlaybackRate(rate)
      const time = (await engineRef.current?.getCurrentTime()) || 0
      onSpeedChange(rate, time)
    },
    [onSpeedChange]
  )

  const toggleMute = useCallback(() => {
    if (mutedPrevVolume !== null) {
      setVolume(mutedPrevVolume)
      setMutedPrevVolume(null)
    } else {
      setMutedPrevVolume(volume)
      setVolume(0)
    }
  }, [mutedPrevVolume, volume])

  const displayTime = seekPreview !== null ? seekPreview : localTime
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  const engineNode = useMemo(() => {
    if (!source) return null
    const commonProps = {
      onReady: () => {
        setIsLoading(false)
        setReady(true)
      },
      onError: (msg) => {
        setIsLoading(false)
        setLoadError(msg)
      },
      onEnded: () => setLocalPlaying(false),
      onPlayStateChange: (playing) => setLocalPlaying(playing),
    }
    if (source.type === 'youtube') {
      return <YouTubeEngine key={engineKey} ref={engineRef} videoId={source.id} {...commonProps} />
    }
    if (source.type === 'vimeo') {
      return <VimeoEngine key={engineKey} ref={engineRef} videoId={source.id} {...commonProps} />
    }
    if (source.type === 'screenshare') {
      // Use whichever stream is available. Pass both so engine can switch if one appears later.
      const activeStream = outgoingStream || incomingStream
      // Key on the stream itself so it re-mounts the moment a real stream is available.
      const streamKey = activeStream ? 'screenshare-live' : 'screenshare-waiting'
      return <ScreenShareEngine key={streamKey} stream={activeStream} isLocal={!!outgoingStream} volume={volume} onReady={commonProps.onReady} />
    }
    return <NativeVideoEngine key={engineKey} ref={engineRef} url={source.url} {...commonProps} />
  }, [source, engineKey, incomingStream, outgoingStream, volume])

  return (
    <div className="glass-panel flex flex-1 flex-col gap-4 p-4 sm:p-5">
      {/* URL input row */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoadClick()}
            placeholder="Paste a YouTube, Vimeo, or MP4/WebM link…"
            className="input-field pl-9"
            aria-label="Video URL"
          />
        </div>
        <button onClick={handleLoadClick} className="btn-primary shrink-0" aria-label="Load video">
          <Film className="h-4 w-4" />
          Load
        </button>
        {outgoingStream ? (
          <button onClick={onStopScreenShare} className="btn-primary bg-marquee-coral/20 text-marquee-coral hover:bg-marquee-coral/30 shrink-0" aria-label="Stop Share">
            Stop Share
          </button>
        ) : (
          <button onClick={onStartScreenShare} className="btn-primary bg-marquee-violet/20 text-marquee-violet hover:bg-marquee-violet/30 shrink-0" aria-label="Share Screen">
            Share Screen
          </button>
        )}
      </div>

      {recentVideos?.length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {recentVideos.slice(0, 4).map((url) => (
            <button
              key={url}
              onClick={() => handlePickRecent(url)}
              className="max-w-[160px] truncate rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-ink-muted transition-colors hover:bg-white/[0.08] hover:text-ink"
              title={url}
            >
              {url.replace(/^https?:\/\//, '')}
            </button>
          ))}
        </div>
      )}

      {loadError && (
        <div className="rounded-xl border border-marquee-coral/30 bg-marquee-coral/10 px-3.5 py-2.5 text-sm text-marquee-coral">
          {loadError}
        </div>
      )}

      {/* Player surface */}
      <div
        ref={containerRef}
        className={`group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-black ${
          isFullscreen ? 'fixed inset-0 z-50 aspect-auto rounded-none' : ''
        }`}
      >
        {!source && (
          <div className="flex flex-col items-center gap-2 text-ink-faint">
            <Film className="h-10 w-10" />
            <p className="text-sm">Paste a link above to start watching together.</p>
          </div>
        )}

        {source && (
          <>
            {engineNode}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-marquee-violet" />
              </div>
            )}

            {/* Screen share control bar — fullscreen + volume + stop */}
            {source.type === 'screenshare' && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="flex items-center gap-1.5">
                  <button onClick={toggleMute} className="btn-icon h-8 w-8 bg-white/10" aria-label="Mute">
                    <VolumeIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-marquee-violet"
                    aria-label="Volume"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {outgoingStream && (
                    <button
                      onClick={onStopScreenShare}
                      className="btn-icon h-8 w-fit gap-1 rounded-xl bg-marquee-coral/30 px-2 text-xs font-medium text-marquee-coral"
                      aria-label="Stop sharing"
                    >
                      Stop Sharing
                    </button>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="btn-icon h-8 w-8 bg-white/10"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Regular video control bar */}
            {source.type !== 'screenshare' && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-8 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <input
                  type="range"
                  min={0}
                  max={localDuration || 0}
                  step={0.1}
                  value={Math.min(displayTime, localDuration || 0)}
                  onChange={(e) => setSeekPreview(Number(e.target.value))}
                  onMouseUp={(e) => commitSeek(Number(e.target.value))}
                  onTouchEnd={(e) => commitSeek(Number(e.target.value))}
                  onKeyUp={(e) => commitSeek(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-marquee-violet"
                  aria-label="Seek"
                />
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={handlePlayPause}
                    className="btn-icon h-8 w-8 shrink-0 bg-white/10"
                    aria-label={localPlaying ? 'Pause' : 'Play'}
                  >
                    {localPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
                  </button>

                  <span className="font-mono text-xs text-white/80 tabular-nums">
                    {formatTime(displayTime)} / {formatTime(localDuration)}
                  </span>

                  <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <button onClick={toggleMute} className="btn-icon h-8 w-8 bg-white/10" aria-label="Mute">
                        <VolumeIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-marquee-violet"
                        aria-label="Volume"
                      />
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowSpeedMenu((v) => !v)}
                        className="btn-icon h-8 w-fit gap-1 bg-white/10 px-2 text-xs font-medium"
                        aria-label="Playback speed"
                        aria-expanded={showSpeedMenu}
                      >
                        <Gauge className="h-3.5 w-3.5" />
                        {speed}x
                      </button>
                      {showSpeedMenu && (
                        <div className="glass absolute bottom-10 right-0 z-10 flex w-20 flex-col overflow-hidden rounded-xl p-1">
                          {SPEEDS.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleSpeedPick(s)}
                              className={`rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/10 ${
                                s === speed ? 'text-marquee-amber' : 'text-white/90'
                              }`}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={toggleFullscreen}
                      className="btn-icon h-8 w-8 bg-white/10"
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
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
