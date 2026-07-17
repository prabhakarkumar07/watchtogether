import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Mic, MicOff, PhoneOff, Pin, PinOff, Video, VideoOff, Users } from 'lucide-react'
import Tooltip from './Tooltip.jsx'

import VideoTile from './VideoTile.jsx'

/* ── VideoCall sidebar component ─────────────────────────────────────────── */
export default React.memo(function VideoCall({
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
  raisedHands = new Set(),
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
            <Tooltip content={isMicOn ? 'Mute' : 'Unmute'} position="bottom">
              <button
                type="button"
                onClick={onToggleMic}
                className="btn-icon h-6 w-6"
                style={!isMicOn ? {
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  color: '#FCA5A5',
                  borderColor: 'rgba(239,68,68,0.3)',
                } : {}}
                aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isMicOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
              </button>
            </Tooltip>
            
            <Tooltip content={isCamOn ? 'Camera off' : 'Camera on'} position="bottom">
              <button
                type="button"
                onClick={onToggleCam}
                className="btn-icon h-6 w-6"
                style={!isCamOn ? {
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  color: '#FCA5A5',
                  borderColor: 'rgba(239,68,68,0.3)',
                } : {}}
                aria-label={isCamOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isCamOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
              </button>
            </Tooltip>

            <Tooltip content="End call" position="bottom">
              <button
                type="button"
                onClick={onHangUp}
                className="btn-icon h-6 w-6"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.15)',
                  color: '#FCA5A5',
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
                aria-label="End call"
              >
                <PhoneOff className="h-3 w-3" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Tile stack */}
      <div className="flex flex-col gap-1 p-1.5">
        {displayedTiles.map((tile) => (
          <div key={tile.id} className="w-full aspect-video rounded overflow-hidden">
            <VideoTile
              stream={tile.stream}
              label={tile.label}
              muted={tile.isLocal}
              isLocal={tile.isLocal}
              isMicOn={tile.isLocal ? isMicOn : true}
              isCamOn={tile.isLocal ? isCamOn : true}
              isHandRaised={raisedHands.has(tile.id)}
              isPinned={pinnedId === tile.id}
              onPin={totalTiles > 1 ? () => handlePin(tile.id) : undefined}
              className="rounded-none border-none"
            />
          </div>
        ))}

        {overflowCount > 0 && (
          <div className="flex items-center justify-center gap-2 py-2 text-[11px] font-medium text-text-muted bg-[#161820] rounded border border-[#1C1E28]">
            <Users className="h-3.5 w-3.5" />
            +{overflowCount} more on call
          </div>
        )}
      </div>
    </div>
  )
})
