import { useCallback, useEffect, useRef, useState } from 'react'
import Peer from 'peerjs'
import { nanoid } from 'nanoid'
import { createRoomCode, roomCodeToPeerId, normalizeRoomCode, describePeerError } from '../lib/peer.js'

const HEARTBEAT_MS = 6000
const MAX_CHAT_HISTORY = 200

function initialVideoState() {
  return {
    source: null, // { type: 'youtube' | 'vimeo' | 'direct', id, url }
    isPlaying: false,
    playbackRate: 1,
    time: 0,
    updatedAt: Date.now(),
  }
}

/**
 * Encapsulates all peer-to-peer room logic: hosting, joining, chat relay,
 * participant tracking, and playback-state synchronization.
 *
 * Topology: a star network. The host holds a DataConnection to every guest;
 * guests only ever talk to the host. The host is the single source of truth
 * for playback state and rebroadcasts every action to all connected guests.
 */
export function useRoom({ username, onToast }) {
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [roomCode, setRoomCode] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [videoState, setVideoState] = useState(initialVideoState())

  const peerRef = useRef(null)
  const connectionsRef = useRef(new Map()) // guestPeerId -> DataConnection (host only)
  const hostConnectionRef = useRef(null) // DataConnection to host (guest only)
  const selfIdRef = useRef(nanoid(8))
  const usernameRef = useRef(username)
  const heartbeatRef = useRef(null)
  usernameRef.current = username

  // Kept in refs (not just state) so long-lived PeerJS event listeners always
  // read the latest value instead of closing over a stale snapshot.
  const videoStateRef = useRef(videoState)
  const messagesRef = useRef(messages)
  useEffect(() => {
    videoStateRef.current = videoState
  }, [videoState])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // `onToast` (from useToast()) is a fresh object every render; keep a ref so
  // memoized callbacks below don't need to be rebuilt every time it changes.
  const toastRef = useRef(onToast)
  toastRef.current = onToast
  const toast = useRef({
    success: (...args) => toastRef.current?.success?.(...args),
    error: (...args) => toastRef.current?.error?.(...args),
    info: (...args) => toastRef.current?.info?.(...args),
    warning: (...args) => toastRef.current?.warning?.(...args),
  }).current

  // ---------- internal helpers ----------

  const addMessage = useCallback((msg) => {
    setMessages((prev) => {
      const next = [...prev, msg]
      return next.length > MAX_CHAT_HISTORY ? next.slice(next.length - MAX_CHAT_HISTORY) : next
    })
  }, [])

  const broadcast = useCallback((payload, exceptPeerId = null) => {
    for (const [peerId, conn] of connectionsRef.current.entries()) {
      if (peerId === exceptPeerId) continue
      if (conn.open) conn.send(payload)
    }
  }, [])

  const sendToHost = useCallback((payload) => {
    if (hostConnectionRef.current?.open) {
      hostConnectionRef.current.send(payload)
    }
  }, [])

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
        try {
          conn.close()
        } catch {
          /* connection may already be closed */
        }
      }
      connectionsRef.current.clear()
      if (hostConnectionRef.current) {
        try {
          hostConnectionRef.current.close()
        } catch {
          /* already closed */
        }
        hostConnectionRef.current = null
      }
      if (peerRef.current) {
        try {
          peerRef.current.destroy()
        } catch {
          /* already destroyed */
        }
        peerRef.current = null
      }
      setStatus('idle')
      setRoomCode(null)
      setIsHost(false)
      setParticipants([])
      setMessages([])
      setVideoState(initialVideoState())
      if (!silent) toast.info?.('You left the room.')
    },
    [stopHeartbeat, toast]
  )

  // ---------- shared: applying a control action to local video state ----------

  const applyControlAction = useCallback((action, payload) => {
    setVideoState((prev) => {
      const now = Date.now()
      switch (action) {
        case 'play':
          return { ...prev, isPlaying: true, time: payload.time, updatedAt: now }
        case 'pause':
          return { ...prev, isPlaying: false, time: payload.time, updatedAt: now }
        case 'seek':
          return { ...prev, time: payload.time, updatedAt: now }
        case 'speed':
          return { ...prev, playbackRate: payload.rate, time: payload.time, updatedAt: now }
        case 'video-change':
          return {
            source: payload.source,
            isPlaying: false,
            playbackRate: 1,
            time: 0,
            updatedAt: now,
          }
        case 'heartbeat':
          return { ...prev, time: payload.time, isPlaying: payload.isPlaying, updatedAt: now }
        default:
          return prev
      }
    })
  }, [])

  // ---------- host-side connection wiring ----------

  const wireGuestConnection = useCallback(
    (conn) => {
      conn.on('open', () => {
        connectionsRef.current.set(conn.peer, conn)
      })

      conn.on('data', (data) => handleIncoming(data, conn))

      conn.on('close', () => {
        const name = conn.metadata?.name || 'A guest'
        connectionsRef.current.delete(conn.peer)
        const list = buildParticipantList(usernameRef.current)
        setParticipants(list)
        broadcast({ type: 'participants', list })
        const sysMsg = {
          id: nanoid(8),
          system: true,
          text: `${name} left the room.`,
          timestamp: Date.now(),
        }
        addMessage(sysMsg)
        broadcast({ type: 'system', message: sysMsg })
        toast.info?.(`${name} left the room.`)
      })

      conn.on('error', () => {
        connectionsRef.current.delete(conn.peer)
      })

      // eslint-disable-next-line no-use-before-define
      function handleIncoming(data, connection) {
        if (!data || typeof data !== 'object') return

        switch (data.type) {
          case 'hello': {
            connection.metadata = { ...connection.metadata, name: data.name }
            connectionsRef.current.set(connection.peer, connection)

            const list = buildParticipantList(usernameRef.current)
            setParticipants(list)

            connection.send({
              type: 'sync-state',
              videoState: videoStateRef.current,
              participants: list,
              messages: messagesRef.current,
              selfId: connection.peer,
            })

            broadcast({ type: 'participants', list }, connection.peer)

            const sysMsg = {
              id: nanoid(8),
              system: true,
              text: `${data.name} joined the room.`,
              timestamp: Date.now(),
            }
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
            broadcast({ type: 'control', action: data.action, payload: data.payload }, null)
            break
          }
          default:
            break
        }
      }
    },
    [addMessage, applyControlAction, broadcast, buildParticipantList, toast]
  )

  // ---------- public actions ----------

  const createRoom = useCallback(() => {
    if (!usernameRef.current?.trim()) {
      toast.error?.('Enter a username first.')
      return
    }
    setStatus('connecting')

    let attempts = 0
    const attemptCreate = () => {
      attempts += 1
      const code = createRoomCode()
      const peer = new Peer(roomCodeToPeerId(code), { debug: 1 })
      peerRef.current = peer

      peer.on('open', () => {
        setRoomCode(code)
        setIsHost(true)
        setStatus('connected')
        setParticipants([{ id: peer.id, name: usernameRef.current, isHost: true }])
        toast.success?.(`Room ${code} created!`)

        heartbeatRef.current = setInterval(() => {
          setVideoState((prev) => {
            if (prev.source && prev.isPlaying) {
              const elapsed = (Date.now() - prev.updatedAt) / 1000
              const time = prev.time + elapsed * prev.playbackRate
              broadcast({ type: 'control', action: 'heartbeat', payload: { time, isPlaying: true } })
              return { ...prev, time, updatedAt: Date.now() }
            }
            return prev
          })
        }, HEARTBEAT_MS)
      })

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

      peer.on('disconnected', () => {
        if (!peer.destroyed) peer.reconnect()
      })
    }

    attemptCreate()
  }, [broadcast, toast, wireGuestConnection])

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

      peer.on('open', () => {
        const conn = peer.connect(roomCodeToPeerId(code), {
          reliable: true,
          metadata: { name: usernameRef.current },
        })
        hostConnectionRef.current = conn

        conn.on('open', () => {
          conn.send({ type: 'hello', name: usernameRef.current })
          setRoomCode(code)
          setIsHost(false)
          setStatus('connected')
          toast.success?.(`Joined room ${code}!`)
        })

        conn.on('data', (data) => handleHostData(data))

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

      peer.on('disconnected', () => {
        if (!peer.destroyed) peer.reconnect()
      })

      function handleHostData(data) {
        if (!data || typeof data !== 'object') return
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
    [addMessage, applyControlAction, leaveRoom, toast]
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

  // Guests forward requests to the host; the host applies + rebroadcasts.
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
  const play = useCallback((time) => dispatchControl('play', { time }), [dispatchControl])
  const pause = useCallback((time) => dispatchControl('pause', { time }), [dispatchControl])
  const seek = useCallback((time) => dispatchControl('seek', { time }), [dispatchControl])
  const setSpeed = useCallback((rate, time) => dispatchControl('speed', { rate, time }), [dispatchControl])

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
  }
}
