import React, { useState, useMemo, useRef, useCallback } from 'react'
import VideoTile from './VideoTile.jsx'

/**
 * Calculates optimal grid dimensions to fit N items into a container
 * while maintaining the aspect ratio as closely as possible.
 */
function calculateGrid(count) {
  if (count <= 1) return { cols: 1, rows: 1 }
  if (count === 2) return { cols: 2, rows: 1 }
  if (count <= 4) return { cols: 2, rows: 2 }
  if (count <= 6) return { cols: 3, rows: 2 }
  if (count <= 9) return { cols: 3, rows: 3 }
  if (count <= 12) return { cols: 4, rows: 3 }
  if (count <= 16) return { cols: 4, rows: 4 }
  
  // For very large numbers, keep it somewhat square but favor width
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)
  return { cols, rows }
}

export default React.memo(function VideoGrid({
  localStream,
  remoteStreams,
  participants,
  selfId,
  isMicOn,
  isCamOn
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
      <div className="flex flex-1 items-center justify-center text-text-muted">
        Waiting for others to join video call...
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
  
  // If we have a pinned item and multiple people, use a spotlight layout:
  // Pinned item takes up the main area, others are in a strip at the bottom/side.
  if (pinnedId && count > 1) {
    const pinnedTile = sortedTiles[0]
    const otherTiles = sortedTiles.slice(1)
    
    return (
      <div className="flex flex-col h-full w-full gap-2 p-2 bg-[#090A0F]">
        {/* Main Pinned Video */}
        <div className="flex-1 min-h-0 relative rounded-lg overflow-hidden border border-app-border">
          <VideoTile
            stream={pinnedTile.stream}
            label={pinnedTile.label}
            muted={pinnedTile.isLocal}
            isLocal={pinnedTile.isLocal}
            isMicOn={pinnedTile.isLocal ? isMicOn : true}
            isCamOn={pinnedTile.isLocal ? isCamOn : true}
            isHost={pinnedTile.isHost}
            isPinned={true}
            onPin={() => handlePin(pinnedTile.id)}
            className="rounded-none border-none"
          />
        </div>
        
        {/* Strip of other participants */}
        <div className="flex gap-2 h-32 shrink-0 overflow-x-auto video-grid-scroll">
          {otherTiles.map(tile => (
            <div key={tile.id} className="w-48 shrink-0 rounded-lg overflow-hidden border border-app-border">
              <VideoTile
                stream={tile.stream}
                label={tile.label}
                muted={tile.isLocal}
                isLocal={tile.isLocal}
                isMicOn={tile.isLocal ? isMicOn : true}
                isCamOn={tile.isLocal ? isCamOn : true}
                isHost={tile.isHost}
                isPinned={false}
                onPin={() => handlePin(tile.id)}
                className="rounded-none border-none"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Normal Grid Layout
  const grid = calculateGrid(count)
  
  return (
    <div 
      ref={containerRef}
      onDoubleClick={toggleFullscreen}
      className="flex flex-col flex-1 h-full w-full p-2 bg-[#090A0F] overflow-hidden"
    >
      <div 
        className="flex-1 min-h-0 grid gap-2 place-content-center w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
        }}
      >
        {sortedTiles.map((tile) => (
          <div key={tile.id} className="w-full h-full relative rounded-lg overflow-hidden border border-app-border">
            <VideoTile
              stream={tile.stream}
              label={tile.label}
              muted={tile.isLocal}
              isLocal={tile.isLocal}
              isMicOn={tile.isLocal ? isMicOn : true}
              isCamOn={tile.isLocal ? isCamOn : true}
              isHost={tile.isHost}
              isPinned={pinnedId === tile.id}
              onPin={count > 1 ? () => handlePin(tile.id) : undefined}
              className="rounded-none border-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
})
