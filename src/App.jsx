import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { AlertTriangle, Layout, Monitor, Sidebar, Square, Video } from 'lucide-react'
import Header from './components/Header.jsx'
import RoomPanel from './components/RoomPanel.jsx'
import Participants from './components/Participants.jsx'
import VideoPlayer from './components/VideoPlayer.jsx'
import VideoCall from './components/VideoCall.jsx'
import Chat from './components/Chat.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useSessionStorage } from './hooks/useSessionStorage.js'
import { useRoom } from './hooks/useRoom.js'
import { useToast } from './context/ToastContext.jsx'
import { STORAGE_KEYS, addRecentVideo, readStorage, writeStorage } from './lib/storage.js'
import { useResizablePanel } from './hooks/useResizablePanel.js'
import EffectsOverlay from './components/EffectsOverlay.jsx'
import EffectsPicker from './components/EffectsPicker.jsx'
import LandingPage from './components/LandingPage.jsx'
import VideoGrid from './components/VideoGrid.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { useGestureDetection } from './hooks/useGestureDetection.js'
import { Grid } from 'lucide-react'

function isBrowserSupported() {
  return typeof window !== 'undefined' && (!!window.RTCPeerConnection || !!window.webkitRTCPeerConnection) && !!window.localStorage
}

/*
 * Layouts:
 *  classic  — left sidebar + center video + right chat
 *  theater  — left sidebar (narrow) + center video (wider, no right panel)
 *  focus    — center video only (no sidebars at all)
 *  sidebar  — left sidebar + center video (right panel hidden, left wider)
 */
const LAYOUTS = [
  { id: 'classic', label: 'Classic',  Icon: Layout,  hint: 'Sidebar · Video · Chat'   },
  { id: 'theater', label: 'Theater',  Icon: Monitor,  hint: 'Sidebar · Max video'       },
  { id: 'focus',   label: 'Focus',    Icon: Square,   hint: 'Video only'                 },
  { id: 'grid',    label: 'Video Call', Icon: Grid,   hint: 'Fullscreen grid'            },
]

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const toast = useToast()

  const [username, setUsername]         = useLocalStorage(STORAGE_KEYS.USERNAME, '')
  const [lastRoom, setLastRoom]         = useSessionStorage(STORAGE_KEYS.LAST_ROOM, '', 7200000) // 2 hours expiry
  const [recentVideos, setRecentVideos] = useLocalStorage(STORAGE_KEYS.RECENT_VIDEOS, [])
  const [savedVolume, setSavedVolume]   = useLocalStorage(STORAGE_KEYS.VOLUME, 0.8)
  const [savedSpeed, setSavedSpeed]     = useLocalStorage(STORAGE_KEYS.PLAYBACK_SPEED, 1)
  const [activeLayout, setActiveLayout] = useState('classic')
  const [showSettings, setShowSettings] = useState(false)

  const [supported]  = useState(isBrowserSupported)
  const [mobileTab, setMobileTab] = useState('video') // video | chat | people

  const autoJoinAttempted = useRef(false)
  // Track whether the user manually selected the grid layout
  const userSelectedGridRef = useRef(false)
  // Gesture detection state
  const [gestureEnabled, setGestureEnabled] = useState(false)
  const room = useRoom({ username, onToast: toast })

  // Stable callback — never changes reference so gesture hook doesn't restart
  const handleGestureDetected = useCallback((effectId) => {
    room.sendEffect(effectId)
  }, [room.sendEffect])

  const initialRoomFromUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('room') || ''
  }, [])

  useEffect(() => {
    if (room.status === 'connected' && room.roomCode) setLastRoom(room.roomCode)
  }, [room.status, room.roomCode, setLastRoom])

  useEffect(() => {
    if (!autoJoinAttempted.current) {
      autoJoinAttempted.current = true
      const targetRoom = initialRoomFromUrl || lastRoom
      const wasHost = readStorage(STORAGE_KEYS.WAS_HOST, false)

      if (targetRoom && room.status === 'idle') {
        if (wasHost && !initialRoomFromUrl) {
          room.createRoom(targetRoom)
        } else {
          room.joinRoom(targetRoom)
        }
      }
    }
  }, [initialRoomFromUrl, lastRoom, room])

  const autoCallJoinAttempted = useRef(false)
  useEffect(() => {
    if (room.status === 'connected' && !autoCallJoinAttempted.current) {
      autoCallJoinAttempted.current = true
      const wasInCall = readStorage(STORAGE_KEYS.WAS_IN_CALL, false)
      if (wasInCall && !room.localCallStream) {
        room.startVideoCall(true) // true = autoJoined (starts disabled)
      }
    }
  }, [room.status, room.localCallStream, room.startVideoCall])

  const handleCopyLink = useCallback(async () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${room.roomCode}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Room link copied!')
    } catch {
      toast.error('Could not copy — paste the URL manually.')
    }
  }, [room.roomCode, toast])

  const handleLeaveRoom = useCallback(() => {
    setLastRoom('')
    writeStorage(STORAGE_KEYS.WAS_HOST, false)
    writeStorage(STORAGE_KEYS.WAS_IN_CALL, false)
    writeStorage(STORAGE_KEYS.VIDEO_STATE, { source: null, isPlaying: false, playbackRate: 1, time: 0, updatedAt: Date.now() })
    writeStorage(STORAGE_KEYS.CHAT_HISTORY, [])
    window.history.replaceState({}, '', window.location.pathname)
    room.leaveRoom()
  }, [setLastRoom, room.leaveRoom])

  const handleLoadVideo = useCallback((parsed) => {
    room.loadVideo(parsed)
    if (parsed?.url) setRecentVideos(addRecentVideo(parsed.url))
  }, [room.loadVideo, setRecentVideos])

  const handleSpeedChange = useCallback((rate, time) => {
    setSavedSpeed(rate)
    room.setSpeed(rate, time)
  }, [setSavedSpeed, room.setSpeed])

  const hasVideoCall = room.localCallStream || room.remoteCallStreams?.size > 0
  const hasLocalCall = !!room.localCallStream
  const canJoinCall = !hasLocalCall && room.remoteCallStreams?.size > 0

  // ── Gesture detection (camera hand gestures → auto reactions) ─────────────
  const { status: gestureStatus, lastGesture } = useGestureDetection({
    stream:            room.localCallStream,        // only process local camera
    onGestureDetected: handleGestureDetected,
    enabled:           gestureEnabled && hasLocalCall, // auto-disable when not in call
  })

  // ── Per-tile camera reaction tracking ─────────────────────────────────────

  const [reactionMap, setReactionMap] = useState(() => new Map())
  const reactionRateLimitRef = useRef(new Map()) // peerId → last trigger ts
  const RATE_LIMIT_MS = 1500
  const REACTION_TTL  = 2000

  useEffect(() => {
    const handleEffect = (e) => {
      // Parse both legacy string and new { effectId, peerId } formats
      const effectId = e.detail && typeof e.detail === 'object' ? e.detail.effectId : e.detail
      const rawPeerId = e.detail && typeof e.detail === 'object' ? e.detail.peerId  : null

      if (!effectId) return

      // Map own peerId → 'local' so it targets the local camera tile
      // room.selfId may be stale from closure — read from the ref via a stable identity
      const key = (!rawPeerId || rawPeerId === room.selfId) ? 'local' : rawPeerId

      const now = Date.now()
      const last = reactionRateLimitRef.current.get(key) || 0
      if (now - last < RATE_LIMIT_MS) return
      reactionRateLimitRef.current.set(key, now)

      const reaction = { id: `${key}-${now}`, effectId, ts: now }

      setReactionMap(prev => {
        const next = new Map(prev)
        const existing = next.get(key) || []
        // Cap at 4 concurrent bursts per tile (oldest evicted)
        const capped = existing.length >= 4 ? existing.slice(1) : existing
        next.set(key, [...capped, reaction])
        return next
      })

      // Auto-expire this reaction after TTL
      setTimeout(() => {
        setReactionMap(prev => {
          const next = new Map(prev)
          const list = (next.get(key) || []).filter(r => r.id !== reaction.id)
          if (list.length === 0) next.delete(key)
          else next.set(key, list)
          return next
        })
      }, REACTION_TTL)
    }

    window.addEventListener('room-effect', handleEffect)
    return () => window.removeEventListener('room-effect', handleEffect)
  }, [room.selfId])  // re-subscribe when selfId changes (on join)

  // Helper: get reactions for a given tile key.
  // Local tiles call this with 'local'; remote tiles call with the peerId.
  const getReactions = useCallback((key) => {
    return reactionMap.get(key) || []
  }, [reactionMap])

  // Derive layout booleans
  const showLeftSidebar  = activeLayout !== 'focus' && activeLayout !== 'grid'
  const showRightPanel   = activeLayout === 'classic'

  // Wrap setActiveLayout to track user intent
  const handleSetActiveLayout = useCallback((layout) => {
    userSelectedGridRef.current = layout === 'grid'
    setActiveLayout(layout)
  }, [])

  // Automatic Layout Switching
  const [preGridLayout, setPreGridLayout] = useState(null)
  
  useEffect(() => {
    // If video/screen share starts and we are in grid, switch to classic
    if (room.videoState?.source && activeLayout === 'grid') {
      setPreGridLayout('grid')
      setActiveLayout('classic')
      userSelectedGridRef.current = false
    }
    
    // If video/screen share ends and we were previously in grid, switch back
    if (!room.videoState?.source && preGridLayout === 'grid') {
      setActiveLayout('grid')
      setPreGridLayout(null)
      userSelectedGridRef.current = true
    }
  }, [room.videoState?.source, activeLayout, preGridLayout])

  useEffect(() => {
    // Only auto-switch to classic if the user did NOT manually select grid.
    // This prevents the layout from jumping when all cameras are turned off
    // while the user intentionally stays in grid mode.
    if (!hasVideoCall && activeLayout === 'grid' && !userSelectedGridRef.current) {
      setActiveLayout('classic')
    }
  }, [hasVideoCall, activeLayout])

  // Resizable panels
  const leftPanel = useResizablePanel({
    defaultWidth: 240,
    minWidth: 180,
    maxWidth: 400,
    storageKey: 'leftSidebarWidth',
    side: 'left',
  })
  
  const rightPanel = useResizablePanel({
    defaultWidth: 280,
    minWidth: 220,
    maxWidth: 450,
    storageKey: 'rightPanelWidth',
    side: 'right',
  })

  if (!supported) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="panel max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-status-error" />
          <h1 className="text-base font-semibold text-text-primary">Browser not supported</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Watch Together needs WebRTC and localStorage. Please use Chrome, Firefox, Edge, or Safari.
          </p>
        </div>
      </div>
    )
  }

  // ── Show landing page when not in a room ──────────────────────────────
  if (room.status === 'idle' || room.status === 'error') {
    return (
      <>
        <EffectsOverlay />
        <LandingPage
          username={username}
          onUsernameChange={setUsername}
          onCreateRoom={room.createRoom}
          onJoinRoom={room.joinRoom}
          initialJoinCode={initialRoomFromUrl || lastRoom}
        />
      </>
    )
  }

  // ── Connecting spinner ────────────────────────────────────────────────
  if (room.status === 'connecting') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-app-base">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-amber" />
        <p className="text-sm font-medium" style={{ color: 'rgba(232,233,240,0.5)' }}>Connecting…</p>
      </div>
    )
  }

  return (
    <>
      <EffectsOverlay />
      <div className="flex h-full flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        roomStatus={room.status}
        roomCode={room.roomCode}
        onCopyLink={handleCopyLink}
        onLeaveRoom={handleLeaveRoom}
        activeLayout={activeLayout}
        setActiveLayout={handleSetActiveLayout}
        layouts={LAYOUTS}
        onOpenSettings={() => setShowSettings(true)}
        raisedHands={room.raisedHands}
        selfId={room.selfId}
        toggleHand={room.toggleHand}
      />

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── Main content area ───────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0 overflow-hidden">

        {/* ════ LEFT SIDEBAR ════════════════════════════════════════════ */}
        {showLeftSidebar && (
          <aside
            style={{ width: leftPanel.width }}
            className="hidden lg:flex flex-col shrink-0 border-r border-app-border relative overflow-visible bg-app-panel"
          >
            {/* Scrollable content area */}
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto sidebar-scroll">

              {/* Room controls */}
              <RoomPanel
                username={username}
                onUsernameChange={setUsername}
                status={room.status}
                roomCode={room.roomCode}
                initialJoinCode={initialRoomFromUrl}
                onCreateRoom={room.createRoom}
                onJoinRoom={room.joinRoom}
                onLeaveRoom={handleLeaveRoom}
                onCopyLink={handleCopyLink}
              />

              {/* Participants list */}
              {room.status === 'connected' && (
                <Participants
                  participants={room.participants}
                  selfId={room.selfId}
                  isHost={room.isHost}
                  roomLocked={room.roomLocked}
                  onToggleLock={room.toggleRoomLock}
                  onMuteAll={room.muteAll}
                  raisedHands={room.raisedHands}
                />
              )}

              {/* ── VIDEO CALL TILES — live in the left sidebar ── */}
              {room.status === 'connected' && hasVideoCall && (
                <VideoCall
                  localStream={room.localCallStream}
                  remoteStreams={room.remoteCallStreams}
                  participants={room.participants}
                  selfId={room.selfId}
                  isMicOn={room.isMicOn}
                  isCamOn={room.isCamOn}
                  onToggleMic={room.toggleMic}
                  onToggleCam={room.toggleCam}
                  onHangUp={room.stopVideoCall}
                  canJoinCall={canJoinCall}
                  onJoinCall={room.startVideoCall}
                  raisedHands={room.raisedHands}
                  peerMediaStates={room.peerMediaStates}
                  getReactions={getReactions}
                />
              )}
            </div>

            {/* Start / join call button — pinned at bottom */}
            {room.status === 'connected' && (
              <div className="p-2 border-t border-app-border shrink-0">
                {canJoinCall ? (
                  /* Others are on a call — show a prominent JOIN button */
                  <button
                    type="button"
                    onClick={room.startVideoCall}
                    className="btn-primary w-full gap-1.5 text-[11px] h-7"
                    aria-label="Join video call"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Join call
                  </button>
                ) : !hasLocalCall ? (
                  /* No call active at all — start one */
                  <button
                    type="button"
                    onClick={room.startVideoCall}
                    className="btn-secondary w-full gap-1.5 text-[11px] h-7"
                    aria-label="Start video call"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Start video call
                  </button>
                ) : null}
              </div>
            )}

            {/* Resize handle */}
            <div
              className="absolute top-0 -right-1.5 bottom-0 w-3 cursor-col-resize hover:bg-white/10 z-10"
              onMouseDown={leftPanel.startResizing}
            />
          </aside>
        )}

        {/* ════ CENTER — VIDEO PLAYER (maximized) ═══════════════════════ */}
        {/*
         * flex-1 min-w-0 min-h-0: takes ALL remaining horizontal + vertical
         * space after sidebars. overflow-hidden ensures the player never
         * leaks outside this container.
         */}
        <div
          className={`flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden ${
            room.status === 'connected' && mobileTab !== 'video'
              ? 'hidden lg:flex'
              : 'flex'
          }`}
        >
          {activeLayout === 'grid' && !room.videoState?.source ? (
            <VideoGrid
              localStream={room.localCallStream}
              remoteStreams={room.remoteCallStreams}
              participants={room.participants}
              selfId={room.selfId}
              isMicOn={room.isMicOn}
              isCamOn={room.isCamOn}
              onToggleMic={room.toggleMic}
              onToggleCam={room.toggleCam}
              onHangUp={room.stopVideoCall}
              canJoinCall={canJoinCall}
              hasLocalCall={hasLocalCall}
              onJoinCall={room.startVideoCall}
              raisedHands={room.raisedHands}
              peerMediaStates={room.peerMediaStates}
              getReactions={getReactions}
            />
          ) : (
            <>
              {/* Mobile-only VideoGrid fallback when not in grid layout but no video is playing */}
              {hasVideoCall && !room.videoState?.source && (
                <div className="lg:hidden flex flex-1 flex-col h-full w-full">
                  <VideoGrid
                    localStream={room.localCallStream}
                    remoteStreams={room.remoteCallStreams}
                    participants={room.participants}
                    selfId={room.selfId}
                    isMicOn={room.isMicOn}
                    isCamOn={room.isCamOn}
                    onToggleMic={room.toggleMic}
                    onToggleCam={room.toggleCam}
                    onHangUp={room.stopVideoCall}
                    canJoinCall={canJoinCall}
                    hasLocalCall={hasLocalCall}
                    onJoinCall={room.startVideoCall}
                    raisedHands={room.raisedHands}
                    peerMediaStates={room.peerMediaStates}
                    getReactions={getReactions}
                  />
                </div>
              )}
              
              {/* Desktop always shows player; Mobile shows player if video source exists or no call active */}
              <div className={`flex flex-col flex-1 h-full w-full ${hasVideoCall && !room.videoState?.source ? 'hidden lg:flex' : 'flex'}`}>
                <VideoPlayer
                  videoState={room.videoState}
                  onLoadVideo={handleLoadVideo}
                  onPlay={room.play}
                  onPause={room.pause}
                  onSeek={room.seek}
                  onSpeedChange={handleSpeedChange}
                  recentVideos={recentVideos}
                  savedVolume={savedVolume}
                  savedSpeed={savedSpeed}
                  onVolumeChange={setSavedVolume}
                  incomingStream={room.incomingStream}
                  outgoingStream={room.outgoingStream}
                  onStartScreenShare={room.startScreenShare}
                  onStopScreenShare={room.stopScreenShare}
                />
              </div>
            </>
          )}
        </div>

        {/* ════ RIGHT PANEL — Chat / People ═════════════════════════════ */}
        {showRightPanel && (
          <RightPanel
            room={room}
            username={username}
            mobileTab={mobileTab}
            width={rightPanel.width}
            onStartResizing={rightPanel.startResizing}
          />
        )}
      </main>

      {/* ── Mobile bottom tabs ──────────────────────────────────────── */}
      {room.status === 'connected' && (
        <div
          className="lg:hidden flex border-t border-app-border shrink-0 bg-app-toolbar"
        >
          {[
            { id: 'video',  label: 'Video'  },
            { id: 'chat',   label: 'Chat'   },
            { id: 'people', label: 'People' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                mobileTab === tab.id
                  ? 'text-text-primary border-t-2 border-accent-blue -mt-px'
                  : 'text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobile chat/people panels */}
      {room.status === 'connected' && mobileTab === 'chat' && (
        <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden bg-app-panel">
          <Chat 
            messages={room.messages} 
            onSend={room.sendChatMessage} 
            selfName={username} 
            typingNames={Array.from(room.typingPeers?.keys() || []).map(id => room.participants.find(p => p.id === id)?.name).filter(Boolean)}
            sendTyping={room.sendTyping}
          />
        </div>
      )}
      {room.status === 'connected' && mobileTab === 'people' && (
        <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-y-auto sidebar-scroll bg-app-panel">
          <Participants
            participants={room.participants}
            selfId={room.selfId}
            isHost={room.isHost}
            roomLocked={room.roomLocked}
            onToggleLock={room.toggleRoomLock}
            onMuteAll={room.muteAll}
            raisedHands={room.raisedHands}
          />
        </div>
      )}
      {/* Mobile: not connected — room panel */}
      {room.status !== 'connected' && (
        <div className="lg:hidden flex flex-col overflow-y-auto flex-1 p-3 bg-app-panel">
          <RoomPanel
            username={username}
            onUsernameChange={setUsername}
            status={room.status}
            roomCode={room.roomCode}
            initialJoinCode={initialRoomFromUrl}
            onCreateRoom={room.createRoom}
            onJoinRoom={room.joinRoom}
            onLeaveRoom={handleLeaveRoom}
            onCopyLink={handleCopyLink}
          />
        </div>
      )}

      {/* ════ CELEBRATION EFFECTS FAB ═════════════════════════════════ */}
      {room.status === 'connected' && (
        <EffectsPicker
          sendEffect={room.sendEffect}
          gestureEnabled={gestureEnabled}
          gestureStatus={gestureStatus}
          onToggleGesture={hasLocalCall ? () => setGestureEnabled(v => !v) : undefined}
        />
      )}

      {/* ════ GESTURE DETECTED BADGE ═══════════════════════════════════ */}
      {lastGesture && (
        <div
          className="gesture-badge"
          key={`${lastGesture.label}-${Date.now()}`}
          aria-live="polite"
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{lastGesture.emoji}</span>
          <span>{lastGesture.label} detected!</span>
        </div>
      )}
    </div>
    </>
  )
}

/* ── Right panel (chat + people tabs) ────────────────────────────────────── */
function RightPanel({ room, username, width, onStartResizing }) {
  const [tab, setTab] = useState('chat')
  const [unread, setUnread] = useState(0)
  const lastLen = useRef(room.messages?.length || 0)
  
  useEffect(() => {
    const currentLen = room.messages?.length || 0
    if (currentLen > lastLen.current) {
      if (tab !== 'chat') setUnread(u => u + (currentLen - lastLen.current))
    }
    lastLen.current = currentLen
  }, [room.messages?.length, tab])
  
  useEffect(() => {
    if (tab === 'chat') setUnread(0)
  }, [tab])

  const typingNames = useMemo(() => {
    if (!room.typingPeers) return []
    const names = []
    for (const pid of room.typingPeers.keys()) {
      const p = room.participants.find(x => x.id === pid)
      if (p && p.name !== username) names.push(p.name)
    }
    return names
  }, [room.typingPeers, room.participants, username])

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 border-l border-app-border relative overflow-visible bg-app-panel"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 -left-1.5 bottom-0 w-3 cursor-col-resize hover:bg-white/10 z-10"
        onMouseDown={onStartResizing}
      />
      
      {/* Tab bar */}
      {room.status === 'connected' && (
        <div className="flex border-b border-app-border shrink-0">
          {[{ id: 'chat', label: 'Chat' }, { id: 'people', label: 'People' }].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'text-text-primary border-b-2 border-accent-blue -mb-px'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t.label}
              {t.id === 'chat' && unread > 0 && (
                <span className="absolute top-2.5 right-6 flex h-3 w-3 items-center justify-center rounded-full bg-status-error text-[8px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {room.status === 'connected' ? (
          tab === 'chat' ? (
            <Chat 
              messages={room.messages} 
              onSend={room.sendChatMessage} 
              selfName={username} 
              typingNames={typingNames}
              sendTyping={room.sendTyping}
            />
          ) : (
            <div className="overflow-y-auto sidebar-scroll flex-1">
              <Participants 
                participants={room.participants} 
                selfId={room.selfId}
                isHost={room.isHost}
                roomLocked={room.roomLocked}
                onToggleLock={room.toggleRoomLock}
                onMuteAll={room.muteAll}
                raisedHands={room.raisedHands}
              />
            </div>
          )
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-xs text-text-muted leading-relaxed">
              Create or join a room to start chatting.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
