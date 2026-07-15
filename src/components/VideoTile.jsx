import React, { useEffect, useRef, useState } from 'react'
import { MicOff, Pin, PinOff, VideoOff, Crown, VolumeX, Volume2, Volume1 } from 'lucide-react'

const VideoTile = React.memo(function VideoTile({
  stream,
  label,
  muted       = false,
  isLocal     = false,
  isMicOn     = true,
  isCamOn     = true,
  isHost      = false,
  isPinned    = false,
  isActiveSpeaker = false,
  onPin,
  className   = '',
  style       = {},
}) {
  const videoRef = useRef(null)
  const [videoVisible, setVideoVisible] = useState(false)
  const [localVolume, setLocalVolume] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) { setVideoVisible(false); return }
    video.srcObject = stream
    video.volume = isLocal ? 0 : localVolume
    video.play().catch(() => {})

    // Check if there's actually an enabled video track
    const checkVideo = () => {
      const tracks = stream.getVideoTracks()
      setVideoVisible(tracks.length > 0 && tracks[0].enabled && tracks[0].readyState !== 'ended')
    }
    checkVideo()

    // Re-check whenever tracks change state
    const tracks = stream.getVideoTracks()
    tracks.forEach((t) => {
      t.addEventListener('ended', checkVideo)
      t.addEventListener('mute',   checkVideo)
      t.addEventListener('unmute', checkVideo)
    })

    return () => {
      if (video.srcObject === stream) video.srcObject = null
      tracks.forEach((t) => {
        t.removeEventListener('ended', checkVideo)
        t.removeEventListener('mute',   checkVideo)
        t.removeEventListener('unmute', checkVideo)
      })
    }
  }, [stream])

  // For local tile, also react to isCamOn toggle (which disables the track)
  useEffect(() => {
    if (!isLocal) return
    setVideoVisible(
      isCamOn &&
      !!stream &&
      stream.getVideoTracks().length > 0 &&
      stream.getVideoTracks()[0].readyState !== 'ended'
    )
  }, [isCamOn, isLocal, stream])

  useEffect(() => {
    if (videoRef.current && !isLocal) {
      videoRef.current.volume = localVolume
    }
  }, [localVolume, isLocal])

  const showVideo = stream && videoVisible
  const VolumeIcon = localVolume === 0 ? VolumeX : localVolume < 0.5 ? Volume1 : Volume2

  return (
    <div
      className={`video-tile group relative w-full h-full overflow-hidden rounded bg-[#090A0F] ${isPinned ? 'video-tile-pinned' : ''} ${className}`}
      style={{
        ...style,
        boxShadow: isActiveSpeaker ? 'inset 0 0 0 3px #3b82f6' : 'none',
        transition: 'box-shadow 0.2s ease-in-out'
      }}
    >
      {/* Hidden video element — always mounted when stream exists so it stays connected */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className={`h-full w-full object-cover ${showVideo ? 'block' : 'hidden'}`}
        />
      )}

      {/* Avatar placeholder — shown when no video or camera off */}
      {!showVideo && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
          style={{ backgroundColor: '#161820' }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
            style={{ backgroundColor: '#1C1E28', color: '#8B8FA8' }}
          >
            {label?.slice(0, 1).toUpperCase() || '?'}
          </div>
          {!isCamOn && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <VideoOff className="h-3 w-3" />
              Camera off
            </span>
          )}
        </div>
      )}

      {/* Bottom label + status row */}
      <div
        className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-1 px-2 py-1.5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88), transparent)' }}
      >
        <span className="flex items-center truncate text-[11px] font-medium text-white/90">
          {label}
          {isLocal && <span className="ml-1 text-[10px] text-white/45">(you)</span>}
          {isHost && <Crown className="ml-1.5 h-3 w-3 text-accent-amber shrink-0" title="Host" />}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isMicOn && (
            <span
              className="flex h-4 w-4 items-center justify-center rounded"
              style={{ backgroundColor: 'rgba(239,68,68,0.9)' }}
              title="Muted"
              aria-label="Muted"
            >
              <MicOff className="h-2.5 w-2.5 text-white" />
            </span>
          )}
        </div>
      </div>

      {/* Hover: pin button */}
      {onPin && (
        <button
          type="button"
          onClick={onPin}
          className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{
            backgroundColor: isPinned ? 'rgba(59,130,246,0.85)' : 'rgba(0,0,0,0.65)',
            color: 'white',
          }}
          title={isPinned ? 'Unpin' : 'Pin to top'}
          aria-label={isPinned ? 'Unpin' : 'Pin participant'}
        >
          {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Hover: volume slider (remote only) */}
      {!isLocal && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-1">
          <button
            onClick={() => setLocalVolume(v => v === 0 ? 1 : 0)}
            className="text-white hover:text-accent-blue transition-colors"
          >
            <VolumeIcon className="h-3.5 w-3.5" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={localVolume}
            onChange={(e) => setLocalVolume(Number(e.target.value))}
            className="h-1 w-12 cursor-pointer appearance-none rounded-full accent-accent-blue bg-white/20"
            title="Local Volume"
          />
        </div>
      )}
    </div>
  )
})

export default VideoTile
