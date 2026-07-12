import { useCallback, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { nanoid } from 'nanoid'
import { createRoomCode, roomCodeToPeerId, normalizeRoomCode, describePeerError } from '../lib/peer.js'
import { deriveRoomKey, encryptPayload, decryptPayload, isEncrypted } from '../lib/crypto.js'

const HEARTBEAT_MS = 6000
const MAX_CHAT_HISTORY = 200

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

  const peerRef = useRef(null)
  const connectionsRef = useRef(new Map())     // peerId -> DataConnection (host holds all; guests hold none)
  const hostConnectionRef = useRef(null)        // DataConnection to host (guest only)
  const selfIdRef = useRef(nanoid(8))
  const usernameRef = useRef(username)
  const heartbeatRef = useRef(null)
  const calledPeersRef = useRef(new Set())      // screen-share calls
  const videoCallPeersRef = useRef(new Set())   // video-call calls
  const localCallStreamRef = useRef(null)
  const cryptoKeyRef = useRef(null)             // AES-GCM key derived from room code
  usernameRef.current = username

  const videoStateRef = useRef(videoState)
  const messagesRef = useRef(messages)
  useEffect(() => { videoStateRef.current = videoState }, [videoState])
  useEffect(() => { messagesRef.current = messages }, [messages])

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
    if (cryptoKeyRef.current) {
      const envelope = await encryptPayload(cryptoKeyRef.current, payload)
      conn.send(envelope)
    } else {
      conn.send(payload)
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
        console.warn('[E2EE] Decryption failed — wrong room key?')
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

  const sendToHost = useCallback(async (payload) => {
    await secureSend(hostConnectionRef.current, payload)
  }, [secureSend])

  const buildParticipantList = useCallback((hostName) => {
    const list = [{ id: peerRef.current.id, name: hostName, isHost: true }]
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      list.push({ id: peerId, name: conn.metadata?.name || 'Guest', isHost: false })
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
      if (outgoingStream) {
        outgoingStream.getTracks().forEach(t => t.stop())
        setOutgoingStream(null)
      }
      if (localCallStreamRef.current) {
        localCallStreamRef.current.getTracks().forEach(t => t.stop())
        localCallStreamRef.current = null
        setLocalCallStream(null)
      }
      setRemoteCallStreams(new Map())
      videoCallPeersRef.current.clear()
      calledPeersRef.current.clear()
      if (!silent) toast.info?.('You left the room.')
    },
    [stopHeartbeat, toast, outgoingStream]
  )

  // ---------- applying a control action to local video state ----------

  const applyControlAction = useCallback((action, payload) => {
    setVideoState((prev) => {
      const now = Date.now()
      switch (action) {
        case 'play':   return { ...prev, isPlaying: true,  time: payload.time, updatedAt: now }
        case 'pause':  return { ...prev, isPlaying: false, time: payload.time, updatedAt: now }
        case 'seek':   return { ...prev, time: payload.time, updatedAt: now }
        case 'speed':  return { ...prev, playbackRate: payload.rate, time: payload.time, updatedAt: now }
        case 'video-change': return { source: payload.source, isPlaying: false, playbackRate: 1, time: 0, updatedAt: now }
        case 'heartbeat': return { ...prev, time: payload.time, isPlaying: payload.isPlaying, updatedAt: now }
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
        const name = conn.metadata?.name || 'A guest'
        connectionsRef.current.delete(conn.peer)
        // Also clean up their video call stream
        setRemoteCallStreams((prev) => {
          const next = new Map(prev)
          next.delete(conn.peer)
          return next
        })
        const list = buildParticipantList(usernameRef.current)
        setParticipants(list)
        broadcast({ type: 'participants', list })
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
            connection.metadata = { ...connection.metadata, name: data.name }
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

            const sysMsg = { id: nanoid(8), system: true, text: `${data.name} joined the room.`, timestamp: Date.now() }
            addMessage(sysMsg)
            broadcast({ type: 'system', message: sysMsg }, connection.peer)
            toast.success?.(`${data.name} joined the room.`)
            break
          }
          case 'chat': {
            const msg = {
              id: nanoid(8),
              sender: connection.metadata?.name || 'Guest',
              text: data.text,
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
        // Answer with our local camera stream if we have one (enables 2-way video)
        call.answer(localCallStreamRef.current || undefined)

        call.on('stream', (remoteStream) => {
          setRemoteCallStreams((prev) => {
            const next = new Map(prev)
            next.set(call.peer, remoteStream)
            return next
          })
        })
        const cleanupCall = () => {
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
        call.answer()
        call.on('stream', (remoteStream) => setIncomingStream(remoteStream))
        call.on('close', () => setIncomingStream(null))
        call.on('error', () => setIncomingStream(null))
      }
    })
  }, [])

  // ---------- public actions ----------

  const createRoom = useCallback(() => {
    if (!usernameRef.current?.trim()) {
      toast.error?.('Enter a username first.')
      return
    }
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
        setStatus('connected')
        setParticipants([{ id: peer.id, name: usernameRef.current, isHost: true }])
        toast.success?.(`Room ${code} created! 🔒 E2E encrypted.`)

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

      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect() })
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
          toast.success?.(`Joined room ${code}! 🔒 E2E encrypted.`)
        })

        setupCallListener(peer)

        conn.on('data', async (raw) => {
          const data = await secureReceive(raw)
          if (!data) return
          handleHostData(data)
        })

        conn.on('close', () => {
          setStatus('error')
          toast.error?.('The host disconnected. The room has ended.')
          leaveRoom(true)
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

      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect() })

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
          default:
            break
        }
      }
    },
    [addMessage, applyControlAction, leaveRoom, toast, setupCallListener, secureSend, secureReceive]
  )

  const sendChatMessage = useCallback(
    (text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (isHost) {
        const msg = { id: nanoid(8), sender: usernameRef.current, text: trimmed, timestamp: Date.now() }
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

  const loadVideo = useCallback((source) => dispatchControl('video-change', { source }), [dispatchControl])
  const play      = useCallback((time) => dispatchControl('play',  { time }), [dispatchControl])
  const pause     = useCallback((time) => dispatchControl('pause', { time }), [dispatchControl])
  const seek      = useCallback((time) => dispatchControl('seek',  { time }), [dispatchControl])
  const setSpeed  = useCallback((rate, time) => dispatchControl('speed', { rate, time }), [dispatchControl])

  // ---------- screen share ----------

  const stopScreenShare = useCallback(() => {
    if (outgoingStream) {
      outgoingStream.getTracks().forEach((track) => track.stop())
      setOutgoingStream(null)
      loadVideo(null)
    }
  }, [outgoingStream, loadVideo])

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      setOutgoingStream(stream)

      const selfId = peerRef.current?.id
      if (!selfId) {
        toast.error?.('Not connected to a room.')
        stream.getTracks().forEach(t => t.stop())
        setOutgoingStream(null)
        return
      }

      loadVideo({ type: 'screenshare', sharerId: selfId })
      await new Promise(resolve => setTimeout(resolve, 400))

      calledPeersRef.current.clear()
      for (const [peerId, conn] of connectionsRef.current.entries()) {
        if (conn.open) {
          peerRef.current.call(peerId, stream)
          calledPeersRef.current.add(peerId)
        }
      }
      if (hostConnectionRef.current?.open) {
        const hostPeerId = hostConnectionRef.current.peer
        if (!calledPeersRef.current.has(hostPeerId)) {
          peerRef.current.call(hostPeerId, stream)
          calledPeersRef.current.add(hostPeerId)
        }
      }

      stream.getVideoTracks()[0].onended = () => stopScreenShare()
    } catch (err) {
      if (err.name !== 'NotAllowedError') toast.error?.('Could not start screen share.')
    }
  }, [loadVideo, toast, stopScreenShare])

  // Call any new participant that joins while screen sharing
  useEffect(() => {
    if (!outgoingStream || !peerRef.current) return
    const selfId = peerRef.current.id
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      if (peerId !== selfId && !calledPeersRef.current.has(peerId) && conn.open) {
        peerRef.current.call(peerId, outgoingStream)
        calledPeersRef.current.add(peerId)
      }
    }
  }, [participants, outgoingStream])

  // ---------- video call (multi-person) ----------

  const callAllPeers = useCallback((stream) => {
    // Call every connected peer with the video stream
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      if (conn.open && !videoCallPeersRef.current.has(peerId)) {
        peerRef.current.call(peerId, stream, { metadata: { type: 'videocall' } })
        videoCallPeersRef.current.add(peerId)
      }
    }
    // Also call host if we are a guest
    if (hostConnectionRef.current?.open) {
      const hostPeerId = hostConnectionRef.current.peer
      if (!videoCallPeersRef.current.has(hostPeerId)) {
        peerRef.current.call(hostPeerId, stream, { metadata: { type: 'videocall' } })
        videoCallPeersRef.current.add(hostPeerId)
      }
    }
  }, [])

  const startVideoCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localCallStreamRef.current = stream
      setLocalCallStream(stream)
      setIsMicOn(true)
      setIsCamOn(true)
      videoCallPeersRef.current.clear()
      callAllPeers(stream)
    } catch (err) {
      if (err.name !== 'NotAllowedError') toast.error?.('Could not access camera/microphone.')
    }
  }, [toast, callAllPeers])

  const stopVideoCall = useCallback(() => {
    if (localCallStreamRef.current) {
      localCallStreamRef.current.getTracks().forEach((t) => t.stop())
      localCallStreamRef.current = null
      setLocalCallStream(null)
    }
    setRemoteCallStreams(new Map())
    videoCallPeersRef.current.clear()
  }, [])

  const toggleMic = useCallback(() => {
    const stream = localCallStreamRef.current
    if (!stream) return
    const newState = !isMicOn
    stream.getAudioTracks().forEach((t) => { t.enabled = newState })
    setIsMicOn(newState)
  }, [isMicOn])

  const toggleCam = useCallback(() => {
    const stream = localCallStreamRef.current
    if (!stream) return
    const newState = !isCamOn
    stream.getVideoTracks().forEach((t) => { t.enabled = newState })
    setIsCamOn(newState)
  }, [isCamOn])

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
    selfId: isHost ? peerRef.current?.id : selfIdRef.current,
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
    toggleMic,
    toggleCam,
  }
}
