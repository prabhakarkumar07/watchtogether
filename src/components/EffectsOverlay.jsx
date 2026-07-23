import { useEffect, useRef } from 'react'

// ─── Effect configs ───────────────────────────────────────────────────────────
const EFFECTS = {
  confetti:    { type: 'shape' },
  hearts:      { type: 'emoji', emojis: ['❤️', '💖'] },
  likes:       { type: 'emoji', emojis: ['👍', '💯'] },
  emojis:      { type: 'emoji', emojis: ['😂', '😍', '🤩'] },
  fire:        { type: 'emoji', emojis: ['🔥'] },
  sparkles:    { type: 'emoji', emojis: ['✨', '💫'] },
  stars:       { type: 'emoji', emojis: ['⭐', '🌟'] },
  petals:      { type: 'emoji', emojis: ['🌸', '🌺'] },
  balloons:    { type: 'emoji', emojis: ['🎈'] },
  snow:        { type: 'emoji', emojis: ['❄️'] },
  rain:        { type: 'emoji', emojis: ['💧'] },
  partypopper: { type: 'emoji', emojis: ['🎉', '🎊'] },
}

const COLORS = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#3b82f6', '#10b981']

// Counts tuned for smooth 60fps
const COUNTS = {
  confetti: 45, partypopper: 45,
  snow: 25, rain: 25,
  default: 22,
}

// Hard cap on total live particles to prevent runaway lag
const MAX_PARTICLES = 120

// ─── Pre-render emoji to offscreen bitmap (drawn as image, not text) ──────────
const emojiCache = new Map()

function getEmojiImage(emoji) {
  if (emojiCache.has(emoji)) return emojiCache.get(emoji)

  const size = 40
  const oc = document.createElement('canvas')
  oc.width = size
  oc.height = size
  const octx = oc.getContext('2d')
  octx.font = `${size * 0.75}px sans-serif`
  octx.textAlign = 'center'
  octx.textBaseline = 'middle'
  octx.fillText(emoji, size / 2, size / 2)

  emojiCache.set(emoji, oc)
  return oc
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EffectsOverlay() {
  const canvasRef    = useRef(null)
  const particlesRef = useRef([])
  const rafRef       = useRef(null)
  const ctxRef       = useRef(null)
  const sizeRef      = useRef({ w: 0, h: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Use 2d context with alpha; willReadFrequently=false is default (fast path)
    const ctx = canvas.getContext('2d', { alpha: true })
    ctxRef.current = ctx

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      sizeRef.current = { w, h }
      // Use device pixel ratio for sharp rendering on retina screens
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width  = w * dpr
      canvas.height = h * dpr
      canvas.style.width  = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', resize)
    resize()

    // ── Spawn ────────────────────────────────────────────────────────────────
    const spawnParticles = (effectId) => {
      const config = EFFECTS[effectId]
      if (!config) return

      const { w, h } = sizeRef.current
      const count = COUNTS[effectId] ?? COUNTS.default

      // Enforce hard cap — drop oldest if needed
      const particles = particlesRef.current
      const slots = Math.min(count, MAX_PARTICLES - particles.length)
      if (slots <= 0) return

      const isDown  = effectId === 'snow' || effectId === 'rain'
      const originX = w / 2
      const originY = h

      for (let i = 0; i < slots; i++) {
        let x, y, vx, vy, gravity, drag

        if (isDown) {
          x       = Math.random() * w
          y       = -30
          vx      = (Math.random() - 0.5) * 1.5
          vy      = effectId === 'rain' ? Math.random() * 8 + 8 : Math.random() * 2 + 1
          gravity = effectId === 'rain' ? 0.1 : 0.02
          drag    = 0.995
        } else {
          x       = originX + (Math.random() - 0.5) * w * 0.55
          y       = originY + 20
          vx      = (Math.random() - 0.5) * 12
          vy      = -(Math.random() * 12 + 8)
          gravity = effectId === 'balloons' ? -0.3 : 0.35
          drag    = 0.97
        }

        particles.push({
          x, y, vx, vy,
          life:     1.0,
          decay:    Math.random() * 0.014 + 0.006,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 8,
          scale:    Math.random() * 0.4 + 0.7,
          color:    COLORS[(Math.random() * COLORS.length) | 0],
          type:     config.type,
          // Pre-fetch bitmap for emoji so draw loop never touches fillText
          bitmap: config.type === 'emoji'
            ? getEmojiImage(config.emojis[(Math.random() * config.emojis.length) | 0])
            : null,
          gravity,
          drag,
        })
      }

      if (!rafRef.current) loop()
    }

    // ── Render loop ──────────────────────────────────────────────────────────
    const loop = () => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)

      const particles = particlesRef.current
      const HALF_IMG = 20   // half of the 40px offscreen canvas

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]

        // Physics — no trig, just linear updates
        p.vy       += p.gravity
        p.vx       *= p.drag
        p.vy       *= p.drag
        p.x        += p.vx
        p.y        += p.vy
        p.rotation += p.rotSpeed
        p.life     -= p.decay

        // Cull dead or out-of-bounds particles
        if (p.life <= 0 || p.y > h + 80 || p.y < -120) {
          particles.splice(i, 1)
          continue
        }

        // Draw — single save/restore per particle
        ctx.globalAlpha = p.life > 0.2 ? p.life : p.life  // keep reference
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation * 0.01745)   // pre-computed deg→rad factor
        ctx.scale(p.scale, p.scale)

        if (p.type === 'emoji' && p.bitmap) {
          // drawImage is GPU-accelerated; zero font/text cost
          ctx.drawImage(p.bitmap, -HALF_IMG, -HALF_IMG)
        } else {
          // Confetti rectangle — just fillRect, no text
          ctx.fillStyle = p.color
          ctx.fillRect(-9, -5, 18, 10)
        }

        ctx.restore()
      }

      ctx.globalAlpha = 1 // reset

      if (particles.length > 0) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        rafRef.current = null
      }
    }

    // ── Event listener ───────────────────────────────────────────────────────
    const handleEffect = (e) => {
      if (localStorage.getItem('disableEffects') === 'true') return
      // Support both legacy plain-string detail and new { effectId, peerId } object
      const effectId = e.detail && typeof e.detail === 'object' ? e.detail.effectId : e.detail
      spawnParticles(effectId)
    }
    window.addEventListener('room-effect', handleEffect)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('room-effect', handleEffect)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      particlesRef.current = []
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
        // Force GPU compositing layer — keeps canvas off the main paint thread
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    />
  )
}
