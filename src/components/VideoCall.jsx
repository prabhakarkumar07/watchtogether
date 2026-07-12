import { useEffect, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'

function VideoTile({ stream, label, muted = false, isLocal = false }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    }
  }, [stream])

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-black/70 border border-white/10 flex-shrink-0"
      style={{ aspectRatio: '16/9', minWidth: 0 }}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black/60">
          <VideoOff className="h-5 w-5 text-white/30" />
        </div>
      )}

      {/* Name tag */}
      <div className="absolute bottom-1 left-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
        {label}
      </div>

      {/* YOU badge */}
      {isLocal && (
        <div className="absolute top-1 right-1 rounded-md bg-marquee-violet/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
          YOU
        </div>
      )}
    </div>
  )
}

/**
 * Multi-person video call panel.
 * Tiles are arranged in a responsive grid:
 *   1 person  → 1 col
 *   2 people  → 2 cols
 *   3–4       → 2 cols (2×2)
 *   5+        → 3 cols
 */
function gridCols(total) {
  if (total <= 1) return 'grid-cols-1'
  if (total <= 2) return 'grid-cols-2'
  if (total <= 4) return 'grid-cols-2'
  return 'grid-cols-3'
}

export default function VideoCall({
  localStream,
  remoteStreams,
  participants,
  isMicOn,
  isCamOn,
  onToggleMic,
  onToggleCam,
  onHangUp,
}) {
  const hasAnyStream = localStream || remoteStreams.size > 0
  if (!hasAnyStream) return null

  const getParticipantName = (peerId) =>
    participants.find((p) => p.id === peerId)?.name || 'Peer'

  const totalTiles = 1 + remoteStreams.size // local + remotes
  const cols = gridCols(totalTiles)

  return (
    <div className="glass-panel flex flex-col gap-2.5 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
            Video Call · {totalTiles} {totalTiles === 1 ? 'person' : 'people'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMic}
            className={`btn-icon h-7 w-7 text-xs ${!isMicOn ? 'bg-marquee-coral/30 text-marquee-coral' : 'bg-white/10'}`}
            title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onToggleCam}
            className={`btn-icon h-7 w-7 ${!isCamOn ? 'bg-marquee-coral/30 text-marquee-coral' : 'bg-white/10'}`}
            title={isCamOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCamOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onHangUp}
            className="btn-icon h-7 w-7 bg-red-500/20 text-red-400 hover:bg-red-500/30"
            title="End call"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Video grid */}
      <div className={`grid ${cols} gap-1.5`}>
        {/* Local tile always first */}
        <VideoTile
          stream={localStream}
          label={isMicOn ? 'You' : '🔇 You'}
          isLocal
          muted
        />

        {/* Remote tiles */}
        {[...remoteStreams.entries()].map(([peerId, stream]) => (
          <VideoTile
            key={peerId}
            stream={stream}
            label={getParticipantName(peerId)}
          />
        ))}
      </div>
    </div>
  )
}
