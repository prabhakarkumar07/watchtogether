import { useEffect, useRef, useState } from 'react'

// MediaPipe Hands served from CDN — zero bundle impact, loads only when enabled
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915'

// Gesture name → { effectId, emoji, label }
export const GESTURE_MAP = {
  love:  { effectId: 'hearts',   emoji: '❤️', label: 'Love'      },
  like:  { effectId: 'likes',    emoji: '👍', label: 'Thumbs Up' },
  shaka: { effectId: 'fire',     emoji: '🤙', label: 'Fire!'     },
  peace: { effectId: 'sparkles', emoji: '✌️', label: 'Peace'     },
  wave:  { effectId: 'confetti', emoji: '🖐️', label: 'Wave'      },
}

const COOLDOWN_MS = 3500   // per-gesture cooldown — prevents spam
const FRAME_SKIP  = 4      // run detector on 1 of every 4 rAF frames ≈ 15 fps
const CONF        = 0.65   // min detection confidence

// Module-level promise — script is inserted only once
let _scriptPromise = null
function loadHandsCDN() {
  if (_scriptPromise) return _scriptPromise
  _scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return }
    if (window.Hands) { resolve(); return }
    const s = document.createElement('script')
    s.src = `${CDN}/hands.js`
    s.crossOrigin = 'anonymous'
    s.onload = resolve
    s.onerror = (e) => { _scriptPromise = null; reject(e) }
    document.head.appendChild(s)
  })
  return _scriptPromise
}

/**
 * Classify a hand gesture from 21 normalized MediaPipe landmarks.
 * Coordinate system: x ∈ [0,1] left→right, y ∈ [0,1] top→bottom.
 */
function classify(lm) {
  if (!lm || lm.length < 21) return null

  const T = 0.04 // fingertip-vs-PIP threshold

  const indexUp = lm[8].y  < lm[6].y  - T
  const midUp   = lm[12].y < lm[10].y - T
  const ringUp  = lm[16].y < lm[14].y - T
  const pinkyUp = lm[20].y < lm[18].y - T

  // Thumb extended sideways — works for both hands & mirrored cameras
  const thumbExt = Math.abs(lm[4].x - lm[9].x) > 0.10

  // Thumb pointing upward (for thumbs-up gesture)
  const thumbUp = lm[4].y < lm[0].y - 0.13

  // ❤️ ILY / Love:     thumb + index + pinky extended
  if (thumbExt && indexUp && !midUp && !ringUp && pinkyUp)  return 'love'
  // 👍 Thumbs Up:      only thumb pointing upward
  if (thumbUp && !indexUp && !midUp && !ringUp && !pinkyUp) return 'like'
  // 🤙 Shaka / Fire:   thumb + pinky (no index)
  if (thumbExt && !indexUp && !midUp && !ringUp && pinkyUp) return 'shaka'
  // ✌️ Peace:          index + middle only
  if (!thumbUp && indexUp && midUp && !ringUp && !pinkyUp)  return 'peace'
  // 🖐️ Wave / Open:   all 4 fingers up
  if (indexUp && midUp && ringUp && pinkyUp)                return 'wave'

  return null
}

/**
 * useGestureDetection
 *
 * Runs MediaPipe Hands on the local camera stream at ~15 fps.
 * Fires onGestureDetected(effectId) when a recognised hand gesture is held.
 *
 * @param {{ stream: MediaStream|null, onGestureDetected: function, enabled: boolean }}
 * @returns {{ status: 'idle'|'loading'|'ready'|'error', lastGesture: object|null }}
 */
export function useGestureDetection({ stream, onGestureDetected, enabled }) {
  const [status,      setStatus]      = useState('idle')
  const [lastGesture, setLastGesture] = useState(null)

  const handsRef      = useRef(null)   // MediaPipe Hands instance
  const videoRef      = useRef(null)   // offscreen <video> for frame capture
  const rafRef        = useRef(null)   // requestAnimationFrame id
  const frameRef      = useRef(0)      // frame counter for FRAME_SKIP
  const busyRef       = useRef(false)  // prevents queuing frames faster than processed
  const cooldownRef   = useRef({})     // gesture → last-fired timestamp
  const enabledRef    = useRef(enabled)
  enabledRef.current  = enabled

  // ── 1. Load & initialize detector ──────────────────────────────────────
  useEffect(() => {
    if (!enabled) { setStatus('idle'); return }
    // Reuse existing instance across re-renders
    if (handsRef.current) { setStatus('ready'); return }

    let cancelled = false
    setStatus('loading')

    ;(async () => {
      try {
        await loadHandsCDN()
        if (cancelled) return

        const hands = new window.Hands({ locateFile: (f) => `${CDN}/${f}` })
        hands.setOptions({
          maxNumHands:            1,
          modelComplexity:        0,    // 0 = lite model — best for real-time
          minDetectionConfidence: CONF,
          minTrackingConfidence:  0.50,
        })

        hands.onResults((results) => {
          busyRef.current = false
          if (!enabledRef.current) return
          if (!results.multiHandLandmarks?.length) return

          const gesture = classify(results.multiHandLandmarks[0])
          if (!gesture) return

          const now  = Date.now()
          const last = cooldownRef.current[gesture] || 0
          if (now - last < COOLDOWN_MS) return
          cooldownRef.current[gesture] = now

          const info = GESTURE_MAP[gesture]
          if (!info) return

          // Show detected-gesture badge for 2.2s then clear
          setLastGesture(info)
          setTimeout(() => setLastGesture(null), 2200)

          onGestureDetected(info.effectId)
        })

        if (cancelled) return
        handsRef.current = hands
        setStatus('ready')
      } catch (err) {
        if (!cancelled) { console.warn('[gesture]', err); setStatus('error') }
      }
    })()

    return () => { cancelled = true }
  }, [enabled, onGestureDetected])

  // ── 2. rAF detection loop ───────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'ready' || !stream || !enabled) return

    // Offscreen video element — never inserted into DOM, just used for frame capture
    const video = document.createElement('video')
    video.srcObject   = stream
    video.autoplay    = true
    video.muted       = true
    video.playsInline = true
    video.width       = 320
    video.height      = 240
    videoRef.current  = video

    frameRef.current  = 0
    busyRef.current   = false

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      if (!enabledRef.current) return
      frameRef.current++
      if (frameRef.current % FRAME_SKIP !== 0) return   // throttle to ~15fps
      if (busyRef.current || video.readyState < 2) return
      busyRef.current = true
      handsRef.current?.send({ image: video }).catch(() => { busyRef.current = false })
    }

    video.play()
      .then(() => { rafRef.current = requestAnimationFrame(loop) })
      .catch(() => {})

    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      busyRef.current = false
      video.srcObject = null
      videoRef.current = null
    }
  }, [status, stream, enabled])

  return { status, lastGesture }
}
