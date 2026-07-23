import React, { useState, useMemo, useRef, useCallback } from 'react'
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react'
import VideoTile from './VideoTile.jsx'

/**
 * Calculates optimal grid dimensions to fit N items into a container
 * while maintaining the aspect ratio as closely as possible.
 */
function getFlexStyle(count) {
  if (count <= 1) return { width: '100%', height: '100%' }
  if (count === 2) return { width: 'calc(50% - 4px)', height: '100%' }
  if (count <= 4) return { width: 'calc(50% - 4px)', height: 'calc(50% - 4px)' }
  if (count <= 6) return { width: 'calc(33.333% - 5.34px)', height: 'calc(50% - 4px)' }
  if (count <= 9) return { width: 'calc(33.333% - 5.34px)', height: 'calc(33.333% - 5.34px)' }
  if (count <= 12) return { width: 'calc(25% - 6px)', height: 'calc(33.333% - 5.34px)' }
  if (count <= 16) return { width: 'calc(25% - 6px)', height: 'calc(25% - 6px)' }
  
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  const gapW = ((cols - 1) * 8) / cols
  const gapH = ((rows - 1) * 8) / rows
  return { 
    width: `calc(${100/cols}% - ${gapW}px)`, 
    height: `calc(${100/rows}% - ${gapH}px)` 
  }
}

export default React.memo(function VideoGrid({
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
  hasLocalCall,
  onJoinCall,
  raisedHands = new Set(),
  peerMediaStates = new Map(),
  getReactions,
}) {
  const [pinnedId, setPinnedId] = useState(null)
  const containerRef = useRef(null)

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  const hasAnyStream = localStream || remoteStreams?.size > 0
  if (!hasAnyStream) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 text-text-muted">
        <p>Waiting for others to join video call...</p>
        {!hasLocalCall && canJoinCall && (
          <button onClick={onJoinCall} className="btn-primary">
            <Video className="h-4 w-4" /> Join Call
          </button>
        )}
      </div>
    )
  }

  const getParticipant = (peerId) =>
    participants.find((p) => p.id === peerId)

  // Build tile list
  const allTiles = useMemo(() => [
    ...(localStream ? [{ 
      id: 'local', 
      stream: localStream, 
      isLocal: true, 
      label: 'You',
      isHost: getParticipant(selfId)?.isHost
    }] : []),
    ...([...(remoteStreams?.entries() || [])].map(([peerId, stream]) => {
      const p = getParticipant(peerId)
      return {
        id:      peerId,
        stream,
        isLocal: false,
        label:   p?.name || 'Peer',
        isHost:  p?.isHost
      }
    })),
  ], [localStream, remoteStreams, participants, selfId])

  const handlePin = (id) => setPinnedId((prev) => (prev === id ? null : id))

  // Sort pinned to first
  const sortedTiles = pinnedId
    ? [...allTiles].sort((a) => (a.id === pinnedId ? -1 : 1))
    : allTiles

  const count = sortedTiles.length
  
  const renderControls = () => {
    if (!hasLocalCall && canJoinCall) {
      return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 backdrop-blur border border-white/10 z-10 shadow-2xl">
          <button onClick={onJoinCall} className="btn-primary rounded-full px-6 py-2 shadow-lg">
            <Video className="h-4 w-4 mr-2" /> Join Call
          </button>
        </div>
      )
    }

    if (hasLocalCall) {
      return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-app-panel/80 px-6 py-3 backdrop-blur border border-white/10 z-10 shadow-2xl">
          <button
            type="button"
            onClick={onToggleMic}
            className="flex items-center justify-center h-12 w-12 rounded-full transition-all"
            style={isMicOn ? { backgroundColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: '#ef4444', color: 'white' }}
            title={isMicOn ? 'Mute' : 'Unmute'}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={onToggleCam}
            className="flex items-center justify-center h-12 w-12 rounded-full transition-all"
            style={isCamOn ? { backgroundColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: '#ef4444', color: 'white' }}
            title={isCamOn ? 'Camera off' : 'Camera on'}
          >
            {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>
          <div className="w-px h-8 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={onHangUp}
            className="flex items-center justify-center h-12 w-16 rounded-full bg-[#ef4444] hover:bg-[#dc2626] transition-colors text-white shadow-lg"
            title="Hang Up"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      )
    }

    return null
  }
  
  // If we have a pinned item and multiple people, use a spotlight layout:
  // Pinned item takes up the main area, others are in a strip at the bottom/side.
  if (pinnedId && count > 1) {
    const pinnedTile = sortedTiles[0]
    const otherTiles = sortedTiles.slice(1)
    
    return (
      <div className="flex flex-col h-full w-full gap-2 p-2 bg-app-subtle relative">
        {/* Main Pinned Video */}
        <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden border border-app-border">
          <VideoTile
            stream={pinnedTile.stream}
            label={pinnedTile.label}
            muted={pinnedTile.isLocal}
            isLocal={pinnedTile.isLocal}
            isMicOn={pinnedTile.isLocal ? isMicOn : (peerMediaStates.get(pinnedTile.id)?.mic ?? true)}
            isCamOn={pinnedTile.isLocal ? isCamOn : (peerMediaStates.get(pinnedTile.id)?.cam ?? true)}
            isHost={pinnedTile.isHost}
            isHandRaised={raisedHands.has(pinnedTile.id)}
            isPinned={true}
            onPin={() => handlePin(pinnedTile.id)}
            reactions={getReactions ? getReactions(pinnedTile.isLocal ? 'local' : pinnedTile.id) : []}
            className="rounded-none border-none"
          />
        </div>
        
        {/* Strip of other participants */}
        <div className="flex gap-2 h-32 shrink-0 overflow-x-auto video-grid-scroll z-0">
          {otherTiles.map(tile => (
            <div key={tile.id} className="w-48 shrink-0 rounded-lg overflow-hidden border border-app-border">
              <VideoTile
                stream={tile.stream}
                label={tile.label}
                muted={tile.isLocal}
                isLocal={tile.isLocal}
                isMicOn={tile.isLocal ? isMicOn : (peerMediaStates.get(tile.id)?.mic ?? true)}
                isCamOn={tile.isLocal ? isCamOn : (peerMediaStates.get(tile.id)?.cam ?? true)}
                isHost={tile.isHost}
                isHandRaised={raisedHands.has(tile.id)}
                isPinned={false}
                onPin={() => handlePin(tile.id)}
                reactions={getReactions ? getReactions(tile.isLocal ? 'local' : tile.id) : []}
                className="rounded-none border-none"
              />
            </div>
          ))}
        </div>
        
        {renderControls()}
      </div>
    )
  }

  // Normal Grid Layout
  const flexStyle = getFlexStyle(count)
  
  return (
    <div 
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="flex flex-col flex-1 h-full w-full p-2 bg-app-subtle overflow-hidden relative"
    >
      <div 
        className="flex-1 min-h-0 flex flex-wrap justify-center content-center items-center gap-2 w-full h-full"
      >
        {sortedTiles.map((tile) => (
          <div key={tile.id} style={flexStyle} className="relative rounded-lg overflow-hidden border border-app-border shrink-0">
            <VideoTile
              stream={tile.stream}
              label={tile.label}
              muted={tile.isLocal}
              isLocal={tile.isLocal}
              isMicOn={tile.isLocal ? isMicOn : (peerMediaStates.get(tile.id)?.mic ?? true)}
              isCamOn={tile.isLocal ? isCamOn : (peerMediaStates.get(tile.id)?.cam ?? true)}
              isHost={tile.isHost}
              isHandRaised={raisedHands.has(tile.id)}
              isPinned={pinnedId === tile.id}
              onPin={count > 1 ? () => handlePin(tile.id) : undefined}
              reactions={getReactions ? getReactions(tile.isLocal ? 'local' : tile.id) : []}
              className="rounded-none border-none"
            />
          </div>
        ))}
      </div>
      
      {renderControls()}
    </div>
  )
})
