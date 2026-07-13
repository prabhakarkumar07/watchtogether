import { useCallback, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { nanoid } from 'nanoid'
import { createRoomCode, roomCodeToPeerId, normalizeRoomCode, describePeerError } from '../lib/peer.js'
import { deriveRoomKey, encryptPayload, decryptPayload, isEncrypted } from '../lib/crypto.js'

const HEARTBEAT_MS = 6000
const MAX_CHAT_HISTORY = 200
const MAX_CHAT_LENGTH = 500
function stripControlCharacters(value) {
  return String(value || '')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code > 31 && code !== 127
    })
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
  return {
    source: null,
    isPlaying: false,
    playbackRate: 1,
    time: 0,
    updatedAt: Date.now(),
  }
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
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [roomCode, setRoomCode] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [videoState, setVideoState] = useState(initialVideoState())
  const [incomingStream, setIncomingStream] = useState(null)
  const [outgoingStream, setOutgoingStream] = useState(null)
  const [localCallStream, setLocalCallStream] = useState(null)
  const [remoteCallStreams, setRemoteCallStreams] = useState(new Map()) // peerId -> MediaStream
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const isMicOnRef = useRef(true)
  const isCamOnRef = useRef(true)
  const isLeavingRef = useRef(false)

  // Sync state to refs
  useEffect(() => { isMicOnRef.current = isMicOn }, [isMicOn])
  useEffect(() => { isCamOnRef.current = isCamOn }, [isCamOn])

  const peerRef = useRef(null)
  const connectionsRef = useRef(new Map())     // peerId -> DataConnection (host holds all; guests hold none)
  const hostConnectionRef = useRef(null)        // DataConnection to host (guest only)
  const selfIdRef = useRef(nanoid(8))
  const usernameRef = useRef(username)
  const heartbeatRef = useRef(null)
  const calledPeersRef = useRef(new Set())      // screen-share calls
  const videoCallPeersRef = useRef(new Set())   // video-call calls
  const screenShareCallsRef = useRef(new Map())
  const videoMediaCallsRef = useRef(new Map())
  const localCallStreamRef = useRef(null)
  const outgoingStreamRef = useRef(null)
  const cryptoKeyRef = useRef(null)             // AES-GCM key derived from room code
  usernameRef.current = username

  const videoStateRef = useRef(videoState)
  const messagesRef = useRef(messages)
  const participantsRef = useRef(participants)
  useEffect(() => { videoStateRef.current = videoState }, [videoState])
  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { participantsRef.current = participants }, [participants])
  useEffect(() => { outgoingStreamRef.current = outgoingStream }, [outgoingStream])

  const toastRef = useRef(onToast)
  toastRef.current = onToast
  const toast = useRef({
    success: (...args) => toastRef.current?.success?.(...args),
    error: (...args) => toastRef.current?.error?.(...args),
    info: (...args) => toastRef.current?.info?.(...args),
    warning: (...args) => toastRef.current?.warning?.(...args),
  }).current

  // ---------- E2E crypto helpers ----------

  /**
   * Encrypt and send a payload over a DataConnection.
   * Falls back to plaintext if the key is not yet derived (should not happen).
   */
  const secureSend = useCallback(async (conn, payload) => {
    if (!conn?.open) return
    try {
      if (cryptoKeyRef.current) {
        const envelope = await encryptPayload(cryptoKeyRef.current, payload)
        conn.send(envelope)
      } else {
        conn.send(payload)
      }
    } catch (err) {
      console.warn('[room] Failed to send payload', err)
      try { conn.close?.() } catch { /* already closed */ }
    }
  }, [])

  /**
   * Decrypt an incoming message. If it's not encrypted, pass it through
   * (handles the brief window before the key is derived, and legacy messages).
   */
  const secureReceive = useCallback(async (raw) => {
    if (!raw || typeof raw !== 'object') return null
    if (isEncrypted(raw)) {
      try {
        return cryptoKeyRef.current ? await decryptPayload(cryptoKeyRef.current, raw) : null
      } catch {
        console.warn('[E2EE] Decryption failed - wrong room key?')
        return null
      }
    }
    return raw // plaintext fallback
  }, [])

  // ---------- internal helpers ----------

  const addMessage = useCallback((msg) => {
    setMessages((prev) => {
      const next = [...prev, msg]
      return next.length > MAX_CHAT_HISTORY ? next.slice(next.length - MAX_CHAT_HISTORY) : next
    })
  }, [])

  const broadcast = useCallback(async (payload, exceptPeerId = null) => {
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      if (peerId === exceptPeerId) continue
      await secureSend(conn, payload)
    }
  }, [secureSend])

  const broadcastParticipantsRef = useRef(null)
  const broadcastParticipants = useCallback((list) => {
    if (broadcastParticipantsRef.current) clearTimeout(broadcastParticipantsRef.current)
    broadcastParticipantsRef.current = setTimeout(() => {
      broadcast({ type: 'participants', list })
    }, 300)
  }, [broadcast])

  const sendToHost = useCallback(async (payload) => {
    await secureSend(hostConnectionRef.current, payload)
  }, [secureSend])

  const buildParticipantList = useCallback((hostName) => {
    const list = [{ id: peerRef.current?.id, name: cleanDisplayText(hostName, 'Host'), isHost: true }].filter((p) => p.id)
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      list.push({ id: peerId, name: cleanDisplayText(conn.metadata?.name), isHost: false })
    }
    return list
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // ---------- teardown ----------

  const leaveRoom = useCallback(
    (silent = false) => {
      isLeavingRef.current = true
      stopHeartbeat()
      for (const conn of connectionsRef.current.values()) {
        try { conn.close() } catch { /* may already be closed */ }
      }
      connectionsRef.current.clear()
      if (hostConnectionRef.current) {
        try { hostConnectionRef.current.close() } catch { /* already closed */ }
        hostConnectionRef.current = null
      }
      if (peerRef.current) {
        try { peerRef.current.destroy() } catch { /* already destroyed */ }
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
      for (const call of screenShareCallsRef.current.values()) {
        try { call.close?.() } catch { /* already closed */ }
      }
      for (const call of videoMediaCallsRef.current.values()) {
        try { call.close?.() } catch { /* already closed */ }
      }
      screenShareCallsRef.current.clear()
      videoMediaCallsRef.current.clear()
      setRemoteCallStreams(new Map())
      videoCallPeersRef.current.clear()
      calledPeersRef.current.clear()
      if (!silent) toast.info?.('You left the room.')
    },
    [stopHeartbeat, toast]
  )

  // ---------- applying a control action to local video state ----------

  const applyControlAction = useCallback((action, payload = {}) => {
    setVideoState((prev) => {
      const now = Date.now()
      const time = Number.isFinite(payload.time) ? Math.max(payload.time, 0) : prev.time
      switch (action) {
        case 'play':   return { ...prev, isPlaying: true, time, updatedAt: now }
        case 'pause':  return { ...prev, isPlaying: false, time, updatedAt: now }
        case 'seek':   return { ...prev, time, updatedAt: now }
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

  // ---------- host-side connection wiring ----------

  const wireGuestConnection = useCallback(
    (conn) => {
      conn.on('open', () => {
        connectionsRef.current.set(conn.peer, conn)
      })

      conn.on('data', async (raw) => {
        const data = await secureReceive(raw)
        if (!data) return
        handleIncoming(data, conn)
      })

      conn.on('close', () => {
        const name = cleanDisplayText(conn.metadata?.name, 'A guest')
        connectionsRef.current.delete(conn.peer)
        // Also clean up their video call stream and screen share
        setRemoteCallStreams((prev) => {
          const next = new Map(prev)
          next.delete(conn.peer)
          return next
        })
        const shareCall = screenShareCallsRef.current.get(conn.peer)
        if (shareCall) {
          try { shareCall.close() } catch {}
          screenShareCallsRef.current.delete(conn.peer)
        }
        calledPeersRef.current.delete(conn.peer)

        const list = buildParticipantList(usernameRef.current)
        setParticipants(list)
        broadcastParticipants(list)
        const sysMsg = { id: nanoid(8), system: true, text: `${name} left the room.`, timestamp: Date.now() }
        addMessage(sysMsg)
        broadcast({ type: 'system', message: sysMsg })
        toast.info?.(`${name} left the room.`)
      })

      conn.on('error', () => {
        connectionsRef.current.delete(conn.peer)
      })

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
          default:
            break
        }
      }
    },
    [addMessage, applyControlAction, broadcast, buildParticipantList, secureSend, toast, secureReceive]
  )

  // ---------- call handling (screen share + video call) ----------

  const setupCallListener = useCallback((peer) => {
    peer.on('call', (call) => {
      const callType = call.metadata?.type || 'screenshare'

      if (callType === 'videocall') {
        // Answer with our local call stream if we have one.
        // If we don't have one yet, answer with null so the call is
        // established — the caller will see our avatar placeholder.
        // When the local user clicks "Join call" and gets a stream,
        // callAllPeers() will create a new outgoing call to that peer.
        call.answer(localCallStreamRef.current || null)

        videoMediaCallsRef.current.set(call.peer, call)
        call.on('stream', (remoteStream) => {
          setRemoteCallStreams((prev) => {
            const next = new Map(prev)
            next.set(call.peer, remoteStream)
            return next
          })
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => {
              setRemoteCallStreams((prev) => {
                const next = new Map(prev)
                next.delete(call.peer)
                return next
              })
            }
          })
        })
        const cleanupCall = () => {
          videoMediaCallsRef.current.delete(call.peer)
          setRemoteCallStreams((prev) => {
            const next = new Map(prev)
            next.delete(call.peer)
            return next
          })
        }
        call.on('close', cleanupCall)
        call.on('error', cleanupCall)
      } else {
        // Screen share: answer without sending a stream back
        screenShareCallsRef.current.set(call.peer, call)
        call.answer()
        call.on('stream', (remoteStream) => {
          setIncomingStream(remoteStream)
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => setIncomingStream(null)
          })
        })
        const cleanupShare = () => {
          screenShareCallsRef.current.delete(call.peer)
          setIncomingStream(null)
        }
        call.on('close', cleanupShare)
        call.on('error', cleanupShare)
      }
    })
  }, [])

  // ---------- public actions ----------

  const createRoom = useCallback(() => {
    if (!usernameRef.current?.trim()) {
      toast.error?.('Enter a username first.')
      return
    }
    isLeavingRef.current = false
    setStatus('connecting')

    let attempts = 0
    const attemptCreate = async () => {
      attempts += 1
      const code = createRoomCode()

      // Derive E2E key from room code BEFORE connecting
      try {
        cryptoKeyRef.current = await deriveRoomKey(code)
      } catch {
        toast.error?.('Failed to set up encryption. Try refreshing.')
        setStatus('error')
        return
      }

      const peer = new Peer(roomCodeToPeerId(code), { debug: 1 })
      peerRef.current = peer

      peer.on('open', () => {
        setRoomCode(code)
        setIsHost(true)
        selfIdRef.current = peer.id
        setStatus('connected')
        setParticipants([{ id: peer.id, name: usernameRef.current, isHost: true }])
        toast.success?.(`Room ${code} created with end-to-end encrypted controls.`)

        heartbeatRef.current = setInterval(() => {
          setVideoState((prev) => {
            if (prev.source && prev.isPlaying && prev.source.type !== 'screenshare') {
              const elapsed = (Date.now() - prev.updatedAt) / 1000
              const time = prev.time + elapsed * prev.playbackRate
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
        if (err.type === 'unavailable-id' && attempts < 5) {
          peer.destroy()
          attemptCreate()
          return
        }
        setStatus('error')
        toast.error?.(describePeerError(err))
      })

      peer.on('disconnected', () => { if (!peer.destroyed && !isLeavingRef.current) peer.reconnect() })
    }

    attemptCreate()
  }, [broadcast, toast, wireGuestConnection, setupCallListener])

  const joinRoom = useCallback(
    (rawCode) => {
      if (!usernameRef.current?.trim()) {
        toast.error?.('Enter a username first.')
        return
      }
      const code = normalizeRoomCode(rawCode || '')
      if (!code) {
        toast.error?.('Enter a room code to join.')
        return
      }

      setStatus('connecting')
      const peer = new Peer({ debug: 1 })
      peerRef.current = peer

      peer.on('open', async () => {
        // Derive E2E key from the same room code
        try {
          cryptoKeyRef.current = await deriveRoomKey(code)
        } catch {
          toast.error?.('Failed to set up encryption. Try refreshing.')
          setStatus('error')
          return
        }

        const conn = peer.connect(roomCodeToPeerId(code), {
          reliable: true,
          metadata: { name: usernameRef.current },
        })
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

        conn.on('close', () => {
          leaveRoom(true)
          setStatus('error')
          toast.error?.('The host disconnected. The room has ended.')
        })

        conn.on('error', (err) => {
          setStatus('error')
          toast.error?.(describePeerError(err))
        })
      })

      peer.on('error', (err) => {
        setStatus('error')
        toast.error?.(describePeerError(err))
      })

      peer.on('disconnected', () => { 
        if (!peer.destroyed && !isLeavingRef.current) peer.reconnect() 
      })

      function handleHostData(data) {
        switch (data.type) {
          case 'sync-state':
            setVideoState(data.videoState)
            setParticipants(data.participants)
            setMessages(data.messages)
            selfIdRef.current = data.selfId
            break
          case 'participants':
            setParticipants(data.list)
            break
          case 'chat':
            addMessage(data.message)
            break
          case 'system':
            addMessage(data.message)
            toast.info?.(data.message.text)
            break
          case 'control':
            applyControlAction(data.action, data.payload)
            break
          case 'effect':
            window.dispatchEvent(new CustomEvent('room-effect', { detail: data.effectId }))
            break
          default:
            break
        }
      }
    },
    [addMessage, applyControlAction, leaveRoom, toast, setupCallListener, secureSend, secureReceive]
  )

  const sendChatMessage = useCallback(
    (text) => {
      const trimmed = cleanChatText(text)
      if (!trimmed) return
      if (isHost) {
        const msg = { id: nanoid(8), sender: cleanDisplayText(usernameRef.current, 'Host'), text: trimmed, timestamp: Date.now() }
        addMessage(msg)
        broadcast({ type: 'chat', message: msg })
      } else {
        sendToHost({ type: 'chat', text: trimmed })
      }
    },
    [addMessage, broadcast, isHost, sendToHost]
  )

  const dispatchControl = useCallback(
    (action, payload) => {
      if (isHost) {
        applyControlAction(action, payload)
        broadcast({ type: 'control', action, payload })
      } else {
        sendToHost({ type: 'control', action, payload })
      }
    },
    [applyControlAction, broadcast, isHost, sendToHost]
  )

  const sendEffect = useCallback(
    (effectId) => {
      // Optimistically show effect locally
      window.dispatchEvent(new CustomEvent('room-effect', { detail: effectId }))
      
      if (isHost) {
        broadcast({ type: 'effect', effectId })
      } else {
        sendToHost({ type: 'effect', effectId })
      }
    },
    [isHost, broadcast, sendToHost]
  )

  const loadVideo = useCallback((source) => dispatchControl('video-change', { source }), [dispatchControl])
  const play      = useCallback((time) => dispatchControl('play',  { time }), [dispatchControl])
  const pause     = useCallback((time) => dispatchControl('pause', { time }), [dispatchControl])
  const seek      = useCallback((time) => dispatchControl('seek',  { time }), [dispatchControl])
  const setSpeed  = useCallback((rate, time) => dispatchControl('speed', { rate, time }), [dispatchControl])

  // ---------- screen share ----------

  const stopScreenShare = useCallback(() => {
    const stream = outgoingStreamRef.current
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      for (const call of screenShareCallsRef.current.values()) {
        try { call.close?.() } catch { /* already closed */ }
      }
      screenShareCallsRef.current.clear()
      calledPeersRef.current.clear()
      outgoingStreamRef.current = null
      setOutgoingStream(null)
      loadVideo(null)
    }
  }, [loadVideo])

  const startScreenShare = useCallback(async () => {
    const selfId = peerRef.current?.id
    if (!selfId || status !== 'connected') {
      toast.error?.('Join or create a room before sharing your screen.')
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error?.('Screen sharing is not available in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      setOutgoingStream(stream)

      loadVideo({ type: 'screenshare', sharerId: selfId })
      await new Promise(resolve => setTimeout(resolve, 400))

      calledPeersRef.current.clear()
      for (const participant of participantsRef.current) {
        const peerId = participant.id
        if (!peerId || peerId === selfId || calledPeersRef.current.has(peerId)) continue
        const call = peerRef.current.call(peerId, stream, { metadata: { type: 'screenshare' } })
        screenShareCallsRef.current.set(peerId, call)
        calledPeersRef.current.add(peerId)
      }

      stream.getVideoTracks()[0].onended = () => stopScreenShare()
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.warning?.('Screen sharing was cancelled.')
      } else {
        toast.error?.('Could not start screen share.')
      }
    }
  }, [loadVideo, toast, stopScreenShare, status])

  // Call any new participant that joins while screen sharing
  useEffect(() => {
    if (!outgoingStream || !peerRef.current) return
    const selfId = peerRef.current.id
    for (const participant of participantsRef.current) {
      const peerId = participant.id
      if (!peerId || peerId === selfId || calledPeersRef.current.has(peerId)) continue
      const call = peerRef.current.call(peerId, outgoingStream, { metadata: { type: 'screenshare' } })
      screenShareCallsRef.current.set(peerId, call)
      calledPeersRef.current.add(peerId)
    }
  }, [participants, outgoingStream])

  // ---------- video call (multi-person) ----------

  const callAllPeers = useCallback((stream) => {
    const selfId = peerRef.current?.id
    if (!selfId || !stream) return
    let callCount = videoCallPeersRef.current.size
    const MAX_VIDEO_CALL_PEERS = 8

    for (const participant of participantsRef.current) {
      if (callCount >= MAX_VIDEO_CALL_PEERS) break
      const peerId = participant.id
      if (!peerId || peerId === selfId || videoCallPeersRef.current.has(peerId)) continue
      
      callCount++
      const call = peerRef.current.call(peerId, stream, { metadata: { type: 'videocall' } })
      videoMediaCallsRef.current.set(peerId, call)
      const cleanup = () => {
        videoMediaCallsRef.current.delete(peerId)
        videoCallPeersRef.current.delete(peerId)
        setRemoteCallStreams((prev) => {
          const next = new Map(prev)
          next.delete(peerId)
          return next
        })
      }
      call.on('stream', (remoteStream) => {
        setRemoteCallStreams((prev) => {
          const next = new Map(prev)
          next.set(peerId, remoteStream)
          return next
        })
      })
      call.on('close', cleanup)
      call.on('error', cleanup)
      videoCallPeersRef.current.add(peerId)
    }
  }, [])

  const startVideoCall = useCallback(async () => {
    try {
      if (status !== 'connected') {
        toast.error?.('Join or create a room before starting a video call.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error?.('Camera and microphone are not available in this browser.')
        return
      }
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
      if (err.name === 'NotAllowedError') {
        toast.warning?.('Camera or microphone permission was denied.')
      } else {
        toast.error?.('Could not access camera or microphone.')
      }
    }
  }, [toast, callAllPeers, status])

  const stopVideoCall = useCallback(() => {
    if (localCallStreamRef.current) {
      localCallStreamRef.current.getTracks().forEach((t) => t.stop())
      localCallStreamRef.current = null
      setLocalCallStream(null)
    }
    for (const call of videoMediaCallsRef.current.values()) {
      try { call.close?.() } catch { /* already closed */ }
    }
    videoMediaCallsRef.current.clear()
    setRemoteCallStreams(new Map())
    videoCallPeersRef.current.clear()
  }, [])

  const toggleMic = useCallback(() => {
    const stream = localCallStreamRef.current
    if (!stream) return
    const newState = !isMicOnRef.current
    stream.getAudioTracks().forEach((t) => { t.enabled = newState })
    setIsMicOn(newState)
  }, [])

  const toggleCam = useCallback(() => {
    const stream = localCallStreamRef.current
    if (!stream) return
    const newState = !isCamOnRef.current
    stream.getVideoTracks().forEach((t) => { t.enabled = newState })
    setIsCamOn(newState)
  }, [])

  // Auto-call any new participant that joins while a video call is active
  useEffect(() => {
    if (!localCallStreamRef.current || !peerRef.current) return
    callAllPeers(localCallStreamRef.current)
  }, [participants, callAllPeers])

  useEffect(() => () => leaveRoom(true), []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status,
    roomCode,
    isHost,
    participants,
    messages,
    videoState,
    selfId: selfIdRef.current,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    loadVideo,
    play,
    pause,
    seek,
    setSpeed,
    startScreenShare,
    stopScreenShare,
    incomingStream,
    outgoingStream,
    localCallStream,
    remoteCallStreams,
    isMicOn,
    isCamOn,
    startVideoCall,
    stopVideoCall,
    sendEffect,
    toggleMic,
    toggleCam,
  }
}
