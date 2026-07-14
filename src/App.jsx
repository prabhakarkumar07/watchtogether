import { useEffect, useMemo, useState, useRef } from 'react'
import { AlertTriangle, Layout, Monitor, Sidebar, Square, Video } from 'lucide-react'
import Header from './components/Header.jsx'
import RoomPanel from './components/RoomPanel.jsx'
import Participants from './components/Participants.jsx'
import VideoPlayer from './components/VideoPlayer.jsx'
import VideoCall from './components/VideoCall.jsx'
import Chat from './components/Chat.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useRoom } from './hooks/useRoom.js'
import { useToast } from './context/ToastContext.jsx'
import { STORAGE_KEYS, addRecentVideo } from './lib/storage.js'
import { useResizablePanel } from './hooks/useResizablePanel.js'
import EffectsOverlay from './components/EffectsOverlay.jsx'
import EffectsPicker from './components/EffectsPicker.jsx'
import LandingPage from './components/LandingPage.jsx'

function isBrowserSupported() {
  return typeof window !== 'undefined' && !!window.RTCPeerConnection && !!window.localStorage
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
  { id: 'sidebar', label: 'Sidebar',  Icon: Sidebar,  hint: 'Wide sidebar · Video'       },
]

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const toast = useToast()

  const [username, setUsername]         = useLocalStorage(STORAGE_KEYS.USERNAME, '')
  const [lastRoom, setLastRoom]         = useLocalStorage(STORAGE_KEYS.LAST_ROOM, '')
  const [recentVideos, setRecentVideos] = useLocalStorage(STORAGE_KEYS.RECENT_VIDEOS, [])
  const [savedVolume, setSavedVolume]   = useLocalStorage(STORAGE_KEYS.VOLUME, 0.8)
  const [savedSpeed, setSavedSpeed]     = useLocalStorage(STORAGE_KEYS.PLAYBACK_SPEED, 1)
  const [activeLayout, setActiveLayout] = useLocalStorage('activeLayout', 'classic')

  const [supported]  = useState(isBrowserSupported)
  const [mobileTab, setMobileTab] = useState('video') // video | chat | people

  const autoJoinAttempted = useRef(false)
  const room = useRoom({ username, onToast: toast })

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
      if (targetRoom && room.status === 'idle') room.joinRoom(targetRoom)
    }
  }, [initialRoomFromUrl, lastRoom, room])

  const handleCopyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${room.roomCode}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Room link copied!')
    } catch {
      toast.error('Could not copy — paste the URL manually.')
    }
  }

  const handleLoadVideo = (parsed) => {
    room.loadVideo(parsed)
    if (parsed?.url) setRecentVideos(addRecentVideo(parsed.url))
  }

  const hasVideoCall = room.localCallStream || room.remoteCallStreams?.size > 0
  const hasLocalCall = !!room.localCallStream
  const canJoinCall = !hasLocalCall && room.remoteCallStreams?.size > 0

  // Derive layout booleans
  const showLeftSidebar  = activeLayout !== 'focus'
  const showRightPanel   = activeLayout === 'classic'

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
        />
      </>
    )
  }

  // ── Connecting spinner ────────────────────────────────────────────────
  if (room.status === 'connecting') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" style={{ backgroundColor: '#090A0F' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
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
        onLeaveRoom={() => { setLastRoom(''); room.leaveRoom() }}
        activeLayout={activeLayout}
        setActiveLayout={setActiveLayout}
        layouts={LAYOUTS}
      />

      {/* ── Main content area ───────────────────────────────────────── */}
      <main className="flex flex-1 min-h-0 overflow-hidden">

        {/* ════ LEFT SIDEBAR ════════════════════════════════════════════ */}
        {showLeftSidebar && (
          <aside
            className="hidden lg:flex flex-col shrink-0 border-r border-app-border relative overflow-visible"
            style={{ backgroundColor: '#0C0D13', width: leftPanel.width }}
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
                onLeaveRoom={() => { setLastRoom(''); room.leaveRoom() }}
                onCopyLink={handleCopyLink}
              />

              {/* Participants list */}
              {room.status === 'connected' && (
                <Participants
                  participants={room.participants}
                  selfId={room.selfId}
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
          <VideoPlayer
            videoState={room.videoState}
            onLoadVideo={handleLoadVideo}
            onPlay={room.play}
            onPause={room.pause}
            onSeek={room.seek}
            onSpeedChange={(rate, time) => { setSavedSpeed(rate); room.setSpeed(rate, time) }}
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
          className="lg:hidden flex border-t border-app-border shrink-0"
          style={{ backgroundColor: '#0C0D13' }}
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
        <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: '#0C0D13' }}>
          <Chat messages={room.messages} onSend={room.sendChatMessage} selfName={username} />
        </div>
      )}
      {room.status === 'connected' && mobileTab === 'people' && (
        <div className="lg:hidden flex flex-col flex-1 min-h-0 overflow-y-auto sidebar-scroll" style={{ backgroundColor: '#0C0D13' }}>
          <Participants participants={room.participants} selfId={room.selfId} />
        </div>
      )}
      {/* Mobile: not connected — room panel */}
      {room.status !== 'connected' && (
        <div className="lg:hidden flex flex-col overflow-y-auto flex-1 p-3" style={{ backgroundColor: '#0C0D13' }}>
          <RoomPanel
            username={username}
            onUsernameChange={setUsername}
            status={room.status}
            roomCode={room.roomCode}
            initialJoinCode={initialRoomFromUrl}
            onCreateRoom={room.createRoom}
            onJoinRoom={room.joinRoom}
            onLeaveRoom={() => { setLastRoom(''); room.leaveRoom() }}
            onCopyLink={handleCopyLink}
          />
        </div>
      )}

      {/* ════ CELEBRATION EFFECTS FAB ═════════════════════════════════ */}
      {room.status === 'connected' && (
        <EffectsPicker sendEffect={room.sendEffect} />
      )}
    </div>
    </>
  )
}

/* ── Right panel (chat + people tabs) ────────────────────────────────────── */
function RightPanel({ room, username, width, onStartResizing }) {
  const [tab, setTab] = useState('chat')

  return (
    <aside
      className="hidden lg:flex flex-col shrink-0 border-l border-app-border relative overflow-visible"
      style={{ backgroundColor: '#0C0D13', width }}
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
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'text-text-primary border-b-2 border-accent-blue -mb-px'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {room.status === 'connected' ? (
          tab === 'chat' ? (
            <Chat messages={room.messages} onSend={room.sendChatMessage} selfName={username} />
          ) : (
            <div className="overflow-y-auto sidebar-scroll flex-1">
              <Participants participants={room.participants} selfId={room.selfId} />
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
