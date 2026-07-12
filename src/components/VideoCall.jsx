import { useEffect, useRef } from 'react'
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'

function VideoTile({ stream, label, muted = false, isLocal = false }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    video.play().catch(() => {})
    return () => {
      if (video.srcObject === stream) video.srcObject = null
    }
  }, [stream])

  return (
    <div className="relative aspect-video min-w-0 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/70">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted || isLocal} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-black/60">
          <VideoOff className="h-5 w-5 text-white/30" />
        </div>
      )}

      <div className="absolute bottom-1 left-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
        {label}
      </div>

      {isLocal && (
        <div className="absolute right-1 top-1 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-void">
          YOU
        </div>
      )}
    </div>
  )
}

function gridCols(total) {
  if (total <= 2) return 'grid-cols-1'
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

  const getParticipantName = (peerId) => participants.find((p) => p.id === peerId)?.name || 'Peer'
  const totalTiles = (localStream ? 1 : 0) + remoteStreams.size
  const cols = gridCols(totalTiles)

  return (
    <section className="glass-panel flex flex-col gap-2.5 p-3" aria-label="Video call">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-marquee-live" />
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Video call - {totalTiles} {totalTiles === 1 ? 'person' : 'people'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onToggleMic} className={'btn-icon h-7 w-7 text-xs ' + (!isMicOn ? 'bg-marquee-coral/20 text-marquee-coral' : 'bg-white/10')} title={isMicOn ? 'Mute microphone' : 'Unmute microphone'} aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}>
            {isMicOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={onToggleCam} className={'btn-icon h-7 w-7 ' + (!isCamOn ? 'bg-marquee-coral/20 text-marquee-coral' : 'bg-white/10')} title={isCamOn ? 'Turn off camera' : 'Turn on camera'} aria-label={isCamOn ? 'Turn off camera' : 'Turn on camera'}>
            {isCamOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={onHangUp} className="btn-icon h-7 w-7 bg-red-500/20 text-red-400 hover:bg-red-500/30" title="End call" aria-label="End call">
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className={'grid ' + cols + ' gap-1.5'}>
        {localStream && <VideoTile stream={localStream} label={isMicOn ? 'You' : 'Muted - You'} isLocal muted />}
        {[...remoteStreams.entries()].map(([peerId, stream]) => (
          <VideoTile key={peerId} stream={stream} label={getParticipantName(peerId)} />
        ))}
      </div>
    </section>
  )
}
