import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Pin, PinOff, Video, VideoOff, Users } from 'lucide-react'

/* ── Single video tile ────────────────────────────────────────────────────── */
const VideoTile = React.memo(function VideoTile({
  stream,
  label,
  muted       = false,
  isLocal     = false,
  isMicOn     = true,
  isCamOn     = true,
  isPinned    = false,
  onPin,
}) {
  const videoRef = useRef(null)
  const [videoVisible, setVideoVisible] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) { setVideoVisible(false); return }
    video.srcObject = stream
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

  const showVideo = stream && videoVisible

  return (
    <div
      className={`video-tile group relative w-full aspect-video ${isPinned ? 'video-tile-pinned' : ''}`}
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
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
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
        <span className="truncate text-[11px] font-medium text-white/90">
          {label}
          {isLocal && <span className="ml-1 text-[10px] text-white/45">(you)</span>}
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
          className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            backgroundColor: isPinned ? 'rgba(59,130,246,0.85)' : 'rgba(0,0,0,0.65)',
            color: 'white',
          }}
          title={isPinned ? 'Unpin' : 'Pin to top'}
          aria-label={isPinned ? 'Unpin' : 'Pin participant'}
        >
          {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
      )}
    </div>
  )
})

/* ── VideoCall sidebar component ─────────────────────────────────────────── */
export default function VideoCall({
  localStream,
  remoteStreams,
  participants,
  selfId,
  isMicOn,
  isCamOn,
  onToggleMic,
  onToggleCam,
  onHangUp,
  canJoinCall,
  onJoinCall,
}) {
  const [pinnedId, setPinnedId] = useState(null)

  const hasAnyStream = localStream || remoteStreams?.size > 0
  if (!hasAnyStream) return null

  const getParticipantName = (peerId) =>
    participants.find((p) => p.id === peerId)?.name || 'Peer'

  // Build tile list
  const allTiles = [
    ...(localStream ? [{ id: 'local', stream: localStream, isLocal: true, label: 'You' }] : []),
    ...([...(remoteStreams?.entries() || [])].map(([peerId, stream]) => ({
      id:      peerId,
      stream,
      isLocal: false,
      label:   getParticipantName(peerId),
    }))),
  ]

  const totalTiles = allTiles.length
  const handlePin  = (id) => setPinnedId((prev) => (prev === id ? null : id))

  // Pinned tile sorts to top
  const sortedTiles = pinnedId
    ? [...allTiles].sort((a) => (a.id === pinnedId ? -1 : 1))
    : allTiles

  const MAX_TILES = 8
  const displayedTiles = sortedTiles.slice(0, MAX_TILES)
  const overflowCount = Math.max(0, totalTiles - MAX_TILES)

  return (
    <div className="flex flex-col border-t border-app-border">
      {/* Section header with controls */}
      <div className="section-header justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-status-online animate-pulse-slow" />
          <span>Video call</span>
          <span
            className="font-mono text-[10px] rounded px-1 py-0.5"
            style={{ backgroundColor: '#161820', color: '#545769' }}
          >
            {totalTiles}
          </span>
        </div>

        {/* Controls — only show if we're in the call */}
        {localStream && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleMic}
              className="btn-icon h-6 w-6"
              style={!isMicOn ? {
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#FCA5A5',
                borderColor: 'rgba(239,68,68,0.3)',
              } : {}}
              title={isMicOn ? 'Mute' : 'Unmute'}
              aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={onToggleCam}
              className="btn-icon h-6 w-6"
              style={!isCamOn ? {
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#FCA5A5',
                borderColor: 'rgba(239,68,68,0.3)',
              } : {}}
              title={isCamOn ? 'Camera off' : 'Camera on'}
              aria-label={isCamOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCamOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={onHangUp}
              className="btn-icon h-6 w-6"
              style={{
                backgroundColor: 'rgba(239,68,68,0.15)',
                color: '#FCA5A5',
                borderColor: 'rgba(239,68,68,0.3)',
              }}
              title="End call"
              aria-label="End call"
            >
              <PhoneOff className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Tile stack */}
      <div className="flex flex-col gap-1 p-1.5">
        {displayedTiles.map((tile) => (
          <VideoTile
            key={tile.id}
            stream={tile.stream}
            label={tile.label}
            muted={tile.isLocal}
            isLocal={tile.isLocal}
            isMicOn={tile.isLocal ? isMicOn : true}
            isCamOn={tile.isLocal ? isCamOn : true}
            isPinned={pinnedId === tile.id}
            onPin={totalTiles > 1 ? () => handlePin(tile.id) : undefined}
          />
        ))}

        {overflowCount > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-[11px] font-medium text-text-muted bg-[#161820] rounded border border-[#1C1E28]">
            <Users className="h-3.5 w-3.5" />
            +{overflowCount} more on call
          </div>
        )}
      </div>

      {/*
       * If we're watching remote streams but haven't joined the call yet,
       * show a "Join call" prompt inside the VideoCall section too.
       * (The main button is also shown at the bottom of the sidebar.)
       */}
      {canJoinCall && (
        <div className="px-1.5 pb-2">
          <button
            type="button"
            onClick={onJoinCall}
            className="btn-primary w-full gap-1.5 text-[11px] h-7"
            aria-label="Join video call"
          >
            <Video className="h-3.5 w-3.5" />
            Join call
          </button>
        </div>
      )}
    </div>
  )
}
