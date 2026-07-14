import { useCallback, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { nanoid } from 'nanoid'
import { createRoomCode, roomCodeToPeerId, normalizeRoomCode, describePeerError } from '../lib/peer.js'
import { deriveRoomKey, encryptPayload, decryptPayload, isEncrypted } from '../lib/crypto.js'

// ─── Constants ────────────────────────────────────────────────────────────────
const HEARTBEAT_MS   = 10000  // Increased from 6s → 10s — 40% fewer encryptions
const MAX_CHAT_HISTORY = 80   // Was 200 — cuts React message array memory by 60%
const MAX_CHAT_LENGTH  = 500
const MAX_VIDEO_CALL_PEERS = 8

// ─── Sanitisers ───────────────────────────────────────────────────────────────
function stripControlCharacters(value) {
  return String(value || '')
    .split('')
    .filter((char) => { const c = char.charCodeAt(0); return c > 31 && c !== 127 })
    .join('')
}
function cleanDisplayText(value, fallback = 'Guest') {
  const cleaned = stripControlCharacters(value).trim()
  return cleaned ? cleaned.slice(0, 80) : fallback
}
function cleanChatText(value) {
  return stripControlCharacters(value).trim().slice(0, MAX_CHAT_LENGTH)
}
function initialVideoState() {
  return { source: null, isPlaying: false, playbackRate: 1, time: 0, updatedAt: Date.now() }
}

/**
 * Encapsulates all peer-to-peer room logic: hosting, joining, chat relay,
 * participant tracking, playback-state synchronization, screen sharing,
 * multi-person video calls, and end-to-end encrypted data channels.
 *
 * Topology: star network — the host holds a DataConnection to every guest.
 * All DataChannel messages are AES-GCM-256 encrypted using a key derived
 * from the room code (PBKDF2). WebRTC MediaConnections (screen share, video
 * call) use DTLS-SRTP which is mandatory and built into the WebRTC spec.
 */
export function useRoom({ username, onToast }) {
  const [status,           setStatus]           = useState('idle')
  const [roomCode,         setRoomCode]         = useState(null)
  const [isHost,           setIsHost]           = useState(false)
  const [participants,     setParticipants]     = useState([])
  const [messages,         setMessages]         = useState([])
  const [videoState,       setVideoState]       = useState(initialVideoState)
  const [incomingStream,   setIncomingStream]   = useState(null)
  const [outgoingStream,   setOutgoingStream]   = useState(null)
  const [localCallStream,  setLocalCallStream]  = useState(null)
  const [remoteCallStreams,setRemoteCallStreams] = useState(new Map())
  const [isMicOn,          setIsMicOn]          = useState(true)
  const [isCamOn,          setIsCamOn]          = useState(true)

  const isMicOnRef = useRef(true)
  const isCamOnRef = useRef(true)
  const isLeavingRef = useRef(false)

  useEffect(() => { isMicOnRef.current = isMicOn }, [isMicOn])
  useEffect(() => { isCamOnRef.current = isCamOn }, [isCamOn])

  // Refs — never cause re-renders
  const peerRef              = useRef(null)
  const connectionsRef       = useRef(new Map())
  const hostConnectionRef    = useRef(null)
  const selfIdRef            = useRef(nanoid(8))
  const usernameRef          = useRef(username)
  const heartbeatRef         = useRef(null)
  const calledPeersRef       = useRef(new Set())
  const videoCallPeersRef    = useRef(new Set())
  const screenShareCallsRef  = useRef(new Map())
  const videoMediaCallsRef   = useRef(new Map())
  const localCallStreamRef   = useRef(null)
  const outgoingStreamRef    = useRef(null)
  const cryptoKeyRef         = useRef(null)
  const bcastDebounceRef     = useRef(null)  // broadcastParticipants debounce

  usernameRef.current = username

  // Shadow refs — avoid useEffect sync cost for hot-path reads
  const videoStateRef    = useRef(videoState)
  const messagesRef      = useRef(messages)
  const participantsRef  = useRef(participants)
  const isHostRef        = useRef(isHost)

  useEffect(() => { videoStateRef.current   = videoState   }, [videoState])
  useEffect(() => { messagesRef.current     = messages     }, [messages])
  useEffect(() => { participantsRef.current = participants }, [participants])
  useEffect(() => { isHostRef.current       = isHost       }, [isHost])
  useEffect(() => { outgoingStreamRef.current = outgoingStream }, [outgoingStream])

  // Stable toast proxy — never changes reference
  const toastRef = useRef(onToast)
  toastRef.current = onToast
  const toast = useRef({
    success: (...a) => toastRef.current?.success?.(...a),
    error:   (...a) => toastRef.current?.error?.(...a),
    info:    (...a) => toastRef.current?.info?.(...a),
    warning: (...a) => toastRef.current?.warning?.(...a),
  }).current

  // ── E2E crypto helpers ──────────────────────────────────────────────────────

  const secureSend = useCallback(async (conn, payload) => {
    if (!conn?.open) return
    try {
      const data = cryptoKeyRef.current
        ? await encryptPayload(cryptoKeyRef.current, payload)
        : payload
      conn.send(data)
    } catch (err) {
      console.warn('[room] send failed', err)
      try { conn.close?.() } catch { /* already closed */ }
    }
  }, [])

  const secureReceive = useCallback(async (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (isEncrypted(raw)) {
      try {
        return cryptoKeyRef.current ? await decryptPayload(cryptoKeyRef.current, raw) : null
      } catch {
        console.warn('[E2EE] Decryption failed')
        return null
      }
    }
    return raw
  }, [])

  // ── Internal helpers ────────────────────────────────────────────────────────

  const addMessage = useCallback((msg) => {
    setMessages((prev) => {
      // Slice from end to keep newest — avoids spreading the whole array twice
      const next = prev.length >= MAX_CHAT_HISTORY
        ? prev.slice(prev.length - MAX_CHAT_HISTORY + 1).concat(msg)
        : prev.concat(msg)
      return next
    })
  }, [])

  // Parallel broadcast — fire-and-forget, no sequential awaiting
  const broadcast = useCallback((payload, exceptPeerId = null) => {
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      if (peerId === exceptPeerId) continue
      secureSend(conn, payload) // intentionally not awaited — parallel sends
    }
  }, [secureSend])

  // Debounced participant broadcast — prevents burst sends on rapid join/leave
  const broadcastParticipants = useCallback((list) => {
    if (bcastDebounceRef.current) clearTimeout(bcastDebounceRef.current)
    bcastDebounceRef.current = setTimeout(() => {
      bcastDebounceRef.current = null
      broadcast({ type: 'participants', list })
    }, 400)
  }, [broadcast])

  const sendToHost = useCallback((payload) => {
    secureSend(hostConnectionRef.current, payload)
  }, [secureSend])

  const buildParticipantList = useCallback((hostName) => {
    const list = [{ id: peerRef.current?.id, name: cleanDisplayText(hostName, 'Host'), isHost: true }].filter(p => p.id)
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      list.push({ id: peerId, name: cleanDisplayText(conn.metadata?.name), isHost: false })
    }
    return list
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
  }, [])

  // ── Teardown ────────────────────────────────────────────────────────────────

  const leaveRoom = useCallback((silent = false) => {
    isLeavingRef.current = true
    stopHeartbeat()
    if (bcastDebounceRef.current) { clearTimeout(bcastDebounceRef.current); bcastDebounceRef.current = null }

    for (const conn of connectionsRef.current.values()) try { conn.close() } catch { /* ok */ }
    connectionsRef.current.clear()

    if (hostConnectionRef.current) {
      try { hostConnectionRef.current.close() } catch { /* ok */ }
      hostConnectionRef.current = null
    }
    if (peerRef.current) {
      try { peerRef.current.destroy() } catch { /* ok */ }
      peerRef.current = null
    }

    cryptoKeyRef.current = null
    setStatus('idle')
    setRoomCode(null)
    setIsHost(false)
    setParticipants([])
    setMessages([])
    setVideoState(initialVideoState())
    setIncomingStream(null)

    if (outgoingStreamRef.current) {
      outgoingStreamRef.current.getTracks().forEach(t => t.stop())
      outgoingStreamRef.current = null
      setOutgoingStream(null)
    }
    if (localCallStreamRef.current) {
      localCallStreamRef.current.getTracks().forEach(t => t.stop())
      localCallStreamRef.current = null
      setLocalCallStream(null)
    }

    for (const call of screenShareCallsRef.current.values()) try { call.close?.() } catch { /* ok */ }
    for (const call of videoMediaCallsRef.current.values())  try { call.close?.() } catch { /* ok */ }
    screenShareCallsRef.current.clear()
    videoMediaCallsRef.current.clear()
    videoCallPeersRef.current.clear()
    calledPeersRef.current.clear()
    setRemoteCallStreams(new Map())

    if (!silent) toast.info?.('You left the room.')
  }, [stopHeartbeat, toast])

  // ── Video state reducer ─────────────────────────────────────────────────────

  const applyControlAction = useCallback((action, payload = {}) => {
    setVideoState((prev) => {
      const now  = Date.now()
      const time = Number.isFinite(payload.time) ? Math.max(payload.time, 0) : prev.time
      switch (action) {
        case 'play':         return { ...prev, isPlaying: true,  time, updatedAt: now }
        case 'pause':        return { ...prev, isPlaying: false, time, updatedAt: now }
        case 'seek':         return { ...prev, time, updatedAt: now }
        case 'speed': {
          const playbackRate = Number.isFinite(payload.rate) ? Math.min(Math.max(payload.rate, 0.25), 3) : prev.playbackRate
          return { ...prev, playbackRate, time, updatedAt: now }
        }
        case 'video-change': {
          const source = payload.source && typeof payload.source === 'object' ? payload.source : null
          return { source, isPlaying: false, playbackRate: 1, time: 0, updatedAt: now }
        }
        case 'heartbeat': return { ...prev, time, isPlaying: Boolean(payload.isPlaying), updatedAt: now }
        default: return prev
      }
    })
  }, [])

  // ── Host connection wiring ──────────────────────────────────────────────────

  const wireGuestConnection = useCallback((conn) => {
    conn.on('open', () => { connectionsRef.current.set(conn.peer, conn) })

    conn.on('data', async (raw) => {
      const data = await secureReceive(raw)
      if (!data) return
      handleIncoming(data, conn)
    })

    conn.on('close', () => {
      const name = cleanDisplayText(conn.metadata?.name, 'A guest')
      connectionsRef.current.delete(conn.peer)

      // Clean up video call resources for this peer
      setRemoteCallStreams((prev) => { const next = new Map(prev); next.delete(conn.peer); return next })
      const shareCall = screenShareCallsRef.current.get(conn.peer)
      if (shareCall) { try { shareCall.close() } catch {} screenShareCallsRef.current.delete(conn.peer) }
      const videoCall = videoMediaCallsRef.current.get(conn.peer)
      if (videoCall) { try { videoCall.close() } catch {} videoMediaCallsRef.current.delete(conn.peer) }
      videoCallPeersRef.current.delete(conn.peer)
      calledPeersRef.current.delete(conn.peer)

      const list = buildParticipantList(usernameRef.current)
      setParticipants(list)
      broadcastParticipants(list)

      const sysMsg = { id: nanoid(8), system: true, text: `${name} left the room.`, timestamp: Date.now() }
      addMessage(sysMsg)
      broadcast({ type: 'system', message: sysMsg })
      toast.info?.(`${name} left the room.`)
    })

    conn.on('error', () => { connectionsRef.current.delete(conn.peer) })

    // eslint-disable-next-line no-use-before-define
    function handleIncoming(data, connection) {
      switch (data.type) {
        case 'hello': {
          connection.metadata = { ...connection.metadata, name: cleanDisplayText(data.name) }
          connectionsRef.current.set(connection.peer, connection)

          const list = buildParticipantList(usernameRef.current)
          setParticipants(list)

          secureSend(connection, {
            type: 'sync-state',
            videoState: videoStateRef.current,
            participants: list,
            messages: messagesRef.current,
            selfId: connection.peer,
          })
          broadcast({ type: 'participants', list }, connection.peer)

          const sysMsg = { id: nanoid(8), system: true, text: `${connection.metadata.name} joined the room.`, timestamp: Date.now() }
          addMessage(sysMsg)
          broadcast({ type: 'system', message: sysMsg }, connection.peer)
          toast.success?.(`${connection.metadata.name} joined the room.`)
          break
        }
        case 'chat': {
          const msg = {
            id: nanoid(8),
            sender: cleanDisplayText(connection.metadata?.name),
            text: cleanChatText(data.text),
            timestamp: Date.now(),
          }
          addMessage(msg)
          broadcast({ type: 'chat', message: msg })
          break
        }
        case 'control': {
          applyControlAction(data.action, data.payload)
          broadcast({ type: 'control', action: data.action, payload: data.payload })
          break
        }
        case 'effect': {
          window.dispatchEvent(new CustomEvent('room-effect', { detail: data.effectId }))
          broadcast({ type: 'effect', effectId: data.effectId }, connection.peer)
          break
        }
        default: break
      }
    }
  }, [addMessage, applyControlAction, broadcast, broadcastParticipants, buildParticipantList, secureSend, toast, secureReceive])

  // ── Call handling (screen share + video call) ───────────────────────────────

  const setupCallListener = useCallback((peer) => {
    peer.on('call', (call) => {
      const callType = call.metadata?.type || 'screenshare'

      if (callType === 'videocall') {
        call.answer(localCallStreamRef.current || null)
        videoMediaCallsRef.current.set(call.peer, call)

        call.on('stream', (remoteStream) => {
          setRemoteCallStreams((prev) => { const next = new Map(prev); next.set(call.peer, remoteStream); return next })
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => {
              setRemoteCallStreams((prev) => { const next = new Map(prev); next.delete(call.peer); return next })
            }
          })
        })

        const cleanupCall = () => {
          videoMediaCallsRef.current.delete(call.peer)
          videoCallPeersRef.current.delete(call.peer)
          setRemoteCallStreams((prev) => { const next = new Map(prev); next.delete(call.peer); return next })
        }
        call.on('close', cleanupCall)
        call.on('error', cleanupCall)
      } else {
        screenShareCallsRef.current.set(call.peer, call)
        call.answer()
        call.on('stream', (remoteStream) => {
          setIncomingStream(remoteStream)
          remoteStream.getTracks().forEach((track) => { track.onended = () => setIncomingStream(null) })
        })
        const cleanupShare = () => { screenShareCallsRef.current.delete(call.peer); setIncomingStream(null) }
        call.on('close', cleanupShare)
        call.on('error', cleanupShare)
      }
    })
  }, [])

  // ── Public actions ──────────────────────────────────────────────────────────

  const createRoom = useCallback(async () => {
    if (!usernameRef.current?.trim()) { toast.error?.('Enter a username first.'); return }
    isLeavingRef.current = false
    setStatus('connecting')

    let attempts = 0
    const attemptCreate = async () => {
      attempts += 1
      const code = createRoomCode()

      try { cryptoKeyRef.current = await deriveRoomKey(code) }
      catch { toast.error?.('Failed to set up encryption. Try refreshing.'); setStatus('error'); return }

      // debug: 0 — no console spam in production, reduces GC pressure
      const peer = new Peer(roomCodeToPeerId(code), { debug: 0 })
      peerRef.current = peer

      peer.on('open', () => {
        setRoomCode(code)
        setIsHost(true)
        selfIdRef.current = peer.id
        setStatus('connected')
        setParticipants([{ id: peer.id, name: usernameRef.current, isHost: true }])
        toast.success?.(`Room ${code} created with end-to-end encrypted controls.`)

        // Heartbeat: sync time drift for guests — fire-and-forget, not awaited
        heartbeatRef.current = setInterval(() => {
          setVideoState((prev) => {
            if (prev.source && prev.isPlaying && prev.source.type !== 'screenshare') {
              const elapsed = (Date.now() - prev.updatedAt) / 1000
              const time    = prev.time + elapsed * prev.playbackRate
              broadcast({ type: 'control', action: 'heartbeat', payload: { time, isPlaying: true } })
              return { ...prev, time, updatedAt: Date.now() }
            }
            return prev
          })
        }, HEARTBEAT_MS)
      })

      setupCallListener(peer)
      peer.on('connection', (conn) => wireGuestConnection(conn))
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && attempts < 5) { peer.destroy(); attemptCreate(); return }
        setStatus('error'); toast.error?.(describePeerError(err))
      })
      peer.on('disconnected', () => { if (!peer.destroyed && !isLeavingRef.current) peer.reconnect() })
    }

    attemptCreate()
  }, [broadcast, toast, wireGuestConnection, setupCallListener])

  const joinRoom = useCallback((rawCode) => {
    if (!usernameRef.current?.trim()) { toast.error?.('Enter a username first.'); return }
    const code = normalizeRoomCode(rawCode || '')
    if (!code) { toast.error?.('Enter a room code to join.'); return }

    isLeavingRef.current = false
    setStatus('connecting')

    // debug: 0 — no console spam
    const peer = new Peer({ debug: 0 })
    peerRef.current = peer

    peer.on('open', async () => {
      try { cryptoKeyRef.current = await deriveRoomKey(code) }
      catch { toast.error?.('Failed to set up encryption. Try refreshing.'); setStatus('error'); return }

      const conn = peer.connect(roomCodeToPeerId(code), { reliable: true, metadata: { name: usernameRef.current } })
      hostConnectionRef.current = conn

      conn.on('open', () => {
        secureSend(conn, { type: 'hello', name: usernameRef.current })
        setRoomCode(code)
        setIsHost(false)
        setStatus('connected')
        toast.success?.(`Joined room ${code} with end-to-end encrypted controls.`)
      })

      setupCallListener(peer)

      conn.on('data', async (raw) => {
        const data = await secureReceive(raw)
        if (!data) return
        handleHostData(data)
      })

      conn.on('close', () => { leaveRoom(true); setStatus('error'); toast.error?.('The host disconnected. The room has ended.') })
      conn.on('error', (err) => { setStatus('error'); toast.error?.(describePeerError(err)) })
    })

    peer.on('error', (err) => { setStatus('error'); toast.error?.(describePeerError(err)) })
    peer.on('disconnected', () => { if (!peer.destroyed && !isLeavingRef.current) peer.reconnect() })

    function handleHostData(data) {
      switch (data.type) {
        case 'sync-state':   setVideoState(data.videoState); setParticipants(data.participants); setMessages(data.messages); selfIdRef.current = data.selfId; break
        case 'participants': setParticipants(data.list); break
        case 'chat':         addMessage(data.message); break
        case 'system':       addMessage(data.message); toast.info?.(data.message.text); break
        case 'control':      applyControlAction(data.action, data.payload); break
        case 'effect':       window.dispatchEvent(new CustomEvent('room-effect', { detail: data.effectId })); break
        default: break
      }
    }
  }, [addMessage, applyControlAction, leaveRoom, toast, setupCallListener, secureSend, secureReceive])

  // ── Chat ────────────────────────────────────────────────────────────────────

  const sendChatMessage = useCallback((text) => {
    const trimmed = cleanChatText(text)
    if (!trimmed) return
    if (isHostRef.current) {
      const msg = { id: nanoid(8), sender: cleanDisplayText(usernameRef.current, 'Host'), text: trimmed, timestamp: Date.now() }
      addMessage(msg)
      broadcast({ type: 'chat', message: msg })
    } else {
      sendToHost({ type: 'chat', text: trimmed })
    }
  }, [addMessage, broadcast, sendToHost])

  // ── Playback controls ───────────────────────────────────────────────────────

  const dispatchControl = useCallback((action, payload) => {
    if (isHostRef.current) {
      applyControlAction(action, payload)
      broadcast({ type: 'control', action, payload })
    } else {
      sendToHost({ type: 'control', action, payload })
    }
  }, [applyControlAction, broadcast, sendToHost])

  const sendEffect = useCallback((effectId) => {
    window.dispatchEvent(new CustomEvent('room-effect', { detail: effectId }))
    if (isHostRef.current) broadcast({ type: 'effect', effectId })
    else sendToHost({ type: 'effect', effectId })
  }, [broadcast, sendToHost])

  const loadVideo = useCallback((source) => dispatchControl('video-change', { source }), [dispatchControl])
  const play      = useCallback((time)   => dispatchControl('play',         { time }),   [dispatchControl])
  const pause     = useCallback((time)   => dispatchControl('pause',        { time }),   [dispatchControl])
  const seek      = useCallback((time)   => dispatchControl('seek',         { time }),   [dispatchControl])
  const setSpeed  = useCallback((rate, time) => dispatchControl('speed',    { rate, time }), [dispatchControl])

  // ── Screen share ────────────────────────────────────────────────────────────

  const stopScreenShare = useCallback(() => {
    const stream = outgoingStreamRef.current
    if (!stream) return
    stream.getTracks().forEach(t => t.stop())
    for (const call of screenShareCallsRef.current.values()) try { call.close?.() } catch { /* ok */ }
    screenShareCallsRef.current.clear()
    calledPeersRef.current.clear()
    outgoingStreamRef.current = null
    setOutgoingStream(null)
    loadVideo(null)
  }, [loadVideo])

  const startScreenShare = useCallback(async () => {
    const selfId = peerRef.current?.id
    if (!selfId || status !== 'connected') { toast.error?.('Join or create a room before sharing your screen.'); return }
    if (!navigator.mediaDevices?.getDisplayMedia) { toast.error?.('Screen sharing is not available in this browser.'); return }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      setOutgoingStream(stream)
      loadVideo({ type: 'screenshare', sharerId: selfId })
      await new Promise(r => setTimeout(r, 400))

      calledPeersRef.current.clear()
      for (const p of participantsRef.current) {
        if (!p.id || p.id === selfId || calledPeersRef.current.has(p.id)) continue
        const call = peerRef.current.call(p.id, stream, { metadata: { type: 'screenshare' } })
        screenShareCallsRef.current.set(p.id, call)
        calledPeersRef.current.add(p.id)
      }
      stream.getVideoTracks()[0].onended = () => stopScreenShare()
    } catch (err) {
      if (err.name === 'NotAllowedError') toast.warning?.('Screen sharing was cancelled.')
      else toast.error?.('Could not start screen share.')
    }
  }, [loadVideo, toast, stopScreenShare, status])

  // Call new participants while screen sharing is active
  useEffect(() => {
    if (!outgoingStream || !peerRef.current) return
    const selfId = peerRef.current.id
    for (const p of participantsRef.current) {
      if (!p.id || p.id === selfId || calledPeersRef.current.has(p.id)) continue
      const call = peerRef.current.call(p.id, outgoingStream, { metadata: { type: 'screenshare' } })
      screenShareCallsRef.current.set(p.id, call)
      calledPeersRef.current.add(p.id)
    }
  }, [participants, outgoingStream])

  // ── Video call ──────────────────────────────────────────────────────────────

  const callAllPeers = useCallback((stream) => {
    const selfId = peerRef.current?.id
    if (!selfId || !stream) return
    let callCount = videoCallPeersRef.current.size

    for (const p of participantsRef.current) {
      if (callCount >= MAX_VIDEO_CALL_PEERS) break
      if (!p.id || p.id === selfId || videoCallPeersRef.current.has(p.id)) continue
      callCount++

      const call = peerRef.current.call(p.id, stream, { metadata: { type: 'videocall' } })
      videoMediaCallsRef.current.set(p.id, call)

      const cleanup = () => {
        videoMediaCallsRef.current.delete(p.id)
        videoCallPeersRef.current.delete(p.id)
        setRemoteCallStreams((prev) => { const next = new Map(prev); next.delete(p.id); return next })
      }
      call.on('stream', (remoteStream) => {
        setRemoteCallStreams((prev) => { const next = new Map(prev); next.set(p.id, remoteStream); return next })
      })
      call.on('close', cleanup)
      call.on('error', cleanup)
      videoCallPeersRef.current.add(p.id)
    }
  }, [])

  const startVideoCall = useCallback(async () => {
    if (status !== 'connected') { toast.error?.('Join or create a room first.'); return }
    if (!navigator.mediaDevices?.getUserMedia) { toast.error?.('Camera not available.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      localCallStreamRef.current = stream
      setLocalCallStream(stream)
      setIsMicOn(true)
      setIsCamOn(true)
      videoCallPeersRef.current.clear()
      callAllPeers(stream)
    } catch (err) {
      if (err.name === 'NotAllowedError') toast.warning?.('Camera or microphone permission was denied.')
      else toast.error?.('Could not access camera or microphone.')
    }
  }, [toast, callAllPeers, status])

  const stopVideoCall = useCallback(() => {
    if (localCallStreamRef.current) {
      localCallStreamRef.current.getTracks().forEach(t => t.stop())
      localCallStreamRef.current = null
      setLocalCallStream(null)
    }
    for (const call of videoMediaCallsRef.current.values()) try { call.close?.() } catch { /* ok */ }
    videoMediaCallsRef.current.clear()
    videoCallPeersRef.current.clear()
    setRemoteCallStreams(new Map())
  }, [])

  const toggleMic = useCallback(() => {
    const stream = localCallStreamRef.current
    if (!stream) return
    const next = !isMicOnRef.current
    stream.getAudioTracks().forEach(t => { t.enabled = next })
    setIsMicOn(next)
  }, [])

  const toggleCam = useCallback(() => {
    const stream = localCallStreamRef.current
    if (!stream) return
    const next = !isCamOnRef.current
    stream.getVideoTracks().forEach(t => { t.enabled = next })
    setIsCamOn(next)
  }, [])

  // Auto-call new participants who join while a video call is in progress.
  // Use a stable ID string comparison so this ONLY fires when the actual peer
  // list changes — not on every unrelated re-render that happens to touch participants.
  const prevParticipantIdsRef = useRef('')
  useEffect(() => {
    const ids = participants.map(p => p.id).sort().join(',')
    if (ids === prevParticipantIdsRef.current) return  // nothing changed — skip
    prevParticipantIdsRef.current = ids
    if (!localCallStreamRef.current || !peerRef.current) return
    callAllPeers(localCallStreamRef.current)
  }, [participants, callAllPeers])

  // Cleanup on unmount
  useEffect(() => () => leaveRoom(true), []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ──────────────────────────────────────────────────────────────

  return {
    status, roomCode, isHost, participants, messages, videoState,
    selfId: selfIdRef.current,
    createRoom, joinRoom, leaveRoom,
    sendChatMessage, sendEffect,
    loadVideo, play, pause, seek, setSpeed,
    startScreenShare, stopScreenShare,
    incomingStream, outgoingStream,
    localCallStream, remoteCallStreams,
    isMicOn, isCamOn,
    startVideoCall, stopVideoCall,
    toggleMic, toggleCam,
  }
}
