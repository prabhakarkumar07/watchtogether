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
    <div className="relative flex-shrink-0 overflow-hidden rounded-xl bg-black/60 border border-white/10" style={{ width: 160, height: 90 }}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <VideoOff className="h-6 w-6 text-white/30" />
        </div>
      )}
      <div className="absolute bottom-1 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm">
        {label}
      </div>
      {isLocal && (
        <div className="absolute top-1 right-1 rounded-full bg-marquee-violet/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
          YOU
        </div>
      )}
    </div>
  )
}

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
}) {
  if (!localStream && remoteStreams.size === 0) return null

  const getParticipantName = (peerId) => {
    return participants.find((p) => p.id === peerId)?.name || 'Peer'
  }

  return (
    <div className="glass-panel flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Video Call</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleMic}
            className={`btn-icon h-7 w-7 ${!isMicOn ? 'bg-marquee-coral/30 text-marquee-coral' : 'bg-white/10'}`}
            title={isMicOn ? 'Mute mic' : 'Unmute mic'}
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
            className="btn-icon h-7 w-7 bg-red-500/20 text-red-400"
            title="End call"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Local tile */}
        <VideoTile
          stream={localStream}
          label="You"
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
