import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Header from './components/Header.jsx'
import RoomPanel from './components/RoomPanel.jsx'
import Participants from './components/Participants.jsx'
import VideoPlayer from './components/VideoPlayer.jsx'
import Chat from './components/Chat.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useRoom } from './hooks/useRoom.js'
import { useToast } from './context/ToastContext.jsx'
import { STORAGE_KEYS, addRecentVideo } from './lib/storage.js'

function isBrowserSupported() {
  return typeof window !== 'undefined' && !!window.RTCPeerConnection && !!window.localStorage
}

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const toast = useToast()

  const [username, setUsername] = useLocalStorage(STORAGE_KEYS.USERNAME, '')
  const [, setLastRoom] = useLocalStorage(STORAGE_KEYS.LAST_ROOM, '')
  const [recentVideos, setRecentVideos] = useLocalStorage(STORAGE_KEYS.RECENT_VIDEOS, [])
  const [savedVolume, setSavedVolume] = useLocalStorage(STORAGE_KEYS.VOLUME, 0.8)
  const [savedSpeed, setSavedSpeed] = useLocalStorage(STORAGE_KEYS.PLAYBACK_SPEED, 1)

  const [supported] = useState(isBrowserSupported)
  const [mobileTab, setMobileTab] = useState('video') // video | chat | people

  const room = useRoom({ username, onToast: toast })

  // Prefill the join code from a shared link like ?room=ABC123, without auto-joining.
  const initialRoomFromUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('room') || ''
  }, [])

  useEffect(() => {
    if (room.status === 'connected' && room.roomCode) {
      setLastRoom(room.roomCode)
    }
  }, [room.status, room.roomCode, setLastRoom])

  const handleCopyLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${room.roomCode}`
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Room link copied to clipboard!')
    } catch {
      toast.error('Could not copy the link — copy it manually from the address bar.')
    }
  }

  const handleLoadVideo = (parsed) => {
    room.loadVideo(parsed)
    setRecentVideos(addRecentVideo(parsed.url))
  }

  if (!supported) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-panel max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-marquee-amber" />
          <h1 className="font-display text-lg font-semibold text-ink">Browser not supported</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Watch Together needs WebRTC and localStorage support. Please open this app in an
            up-to-date Chrome, Firefox, Edge, or Safari browser.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 sm:p-6 lg:flex-row">
        {/* Left column: room + participants */}
        <div className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
          <RoomPanel
            username={username}
            onUsernameChange={setUsername}
            status={room.status}
            roomCode={room.roomCode}
            initialJoinCode={initialRoomFromUrl}
            onCreateRoom={room.createRoom}
            onJoinRoom={room.joinRoom}
            onLeaveRoom={room.leaveRoom}
            onCopyLink={handleCopyLink}
          />
          {room.status === 'connected' && (
            <div className="hidden lg:block">
              <Participants participants={room.participants} selfId={room.selfId} />
            </div>
          )}
        </div>

        {/* Mobile tab switcher, only visible once in a room */}
        {room.status === 'connected' && (
          <div className="glass-panel flex gap-1 p-1 lg:hidden">
            {[
              { id: 'video', label: 'Video' },
              { id: 'chat', label: 'Chat' },
              { id: 'people', label: 'People' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  mobileTab === tab.id ? 'bg-white/10 text-ink' : 'text-ink-faint'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Center: video player */}
        <div
          className={`flex min-w-0 flex-1 flex-col gap-4 ${
            room.status === 'connected' && mobileTab !== 'video' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <VideoPlayer
            videoState={room.videoState}
            onLoadVideo={handleLoadVideo}
            onPlay={room.play}
            onPause={room.pause}
            onSeek={room.seek}
            onSpeedChange={(rate, time) => {
              setSavedSpeed(rate)
              room.setSpeed(rate, time)
            }}
            recentVideos={recentVideos}
            savedVolume={savedVolume}
            savedSpeed={savedSpeed}
            onVolumeChange={setSavedVolume}
          />
        </div>

        {/* Right column: chat (and participants on mobile) */}
        <div
          className={`flex min-h-0 flex-col gap-4 lg:w-80 lg:shrink-0 ${
            room.status === 'connected' && mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
          style={{ minHeight: room.status === 'connected' ? '24rem' : undefined }}
        >
          {room.status === 'connected' ? (
            <Chat messages={room.messages} onSend={room.sendChatMessage} selfName={username} />
          ) : (
            <div className="glass-panel flex flex-1 items-center justify-center p-6 text-center text-sm text-ink-faint">
              Create or join a room to start chatting.
            </div>
          )}
        </div>

        {room.status === 'connected' && mobileTab === 'people' && (
          <div className="lg:hidden">
            <Participants participants={room.participants} selfId={room.selfId} />
          </div>
        )}
      </main>

      <footer className="px-6 py-4 text-center text-xs text-ink-faint">
        Peer-to-peer &amp; serverless — your video and chat never touch a server.
      </footer>
    </div>
  )
}
