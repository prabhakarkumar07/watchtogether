import React, { useEffect, useRef } from 'react'

const EFFECTS = {
  confetti: { type: 'shape' },
  hearts: { type: 'emoji', emojis: ['❤️', '💖', '💗'] },
  likes: { type: 'emoji', emojis: ['👍', '💯', '👏'] },
  emojis: { type: 'emoji', emojis: ['😂', '😍', '😎', '🤩'] },
  fire: { type: 'emoji', emojis: ['🔥'] },
  sparkles: { type: 'emoji', emojis: ['✨', '💫'] },
  stars: { type: 'emoji', emojis: ['⭐', '🌟'] },
  petals: { type: 'emoji', emojis: ['🌸', '🌺', '💮'] },
  balloons: { type: 'emoji', emojis: ['🎈'] },
  snow: { type: 'emoji', emojis: ['❄️', '🌨️'] },
  rain: { type: 'emoji', emojis: ['🌧️', '💧'] },
  partypopper: { type: 'emoji', emojis: ['🎉', '🎊'] }
}

const COLORS = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#3b82f6', '#10b981']

export default function EffectsOverlay() {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let width = window.innerWidth
    let height = window.innerHeight

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener('resize', resize)
    resize()

    const spawnParticles = (effectId) => {
      const config = EFFECTS[effectId]
      if (!config) return

      const count = effectId === 'confetti' || effectId === 'partypopper' ? 80 : 35
      const originX = width / 2
      const originY = height

      for (let i = 0; i < count; i++) {
        // Spread logic
        let vx, vy, x, y
        if (effectId === 'snow' || effectId === 'rain') {
          x = Math.random() * width
          y = -50
          vx = (Math.random() - 0.5) * 2
          vy = Math.random() * 5 + (effectId === 'rain' ? 10 : 2)
        } else {
          x = originX + (Math.random() - 0.5) * (width * 0.5)
          y = originY + 50
          vx = (Math.random() - 0.5) * 15
          vy = -(Math.random() * 15 + 10)
        }

        const particle = {
          x, y, vx, vy,
          life: 1.0,
          decay: Math.random() * 0.015 + 0.005,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10,
          scale: Math.random() * 0.5 + 0.8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          type: config.type,
          emoji: config.type === 'emoji' ? config.emojis[Math.floor(Math.random() * config.emojis.length)] : null,
          gravity: effectId === 'balloons' ? -0.5 : (effectId === 'snow' ? 0.05 : 0.4),
          drag: 0.98
        }
        particlesRef.current.push(particle)
      }

      if (!animationRef.current) loop()
    }

    const loop = () => {
      ctx.clearRect(0, 0, width, height)
      const particles = particlesRef.current

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        
        // Physics update
        p.vy += p.gravity
        p.vx *= p.drag
        p.vy *= p.drag
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotSpeed
        p.life -= p.decay

        if (p.life <= 0 || p.y > height + 100 || (p.vy < 0 && p.y < -100)) {
          particles.splice(i, 1)
          continue
        }

        // Draw
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.scale(p.scale, p.scale)
        ctx.globalAlpha = Math.max(0, p.life)

        if (p.type === 'emoji') {
          ctx.font = '32px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.emoji, 0, 0)
        } else {
          // Confetti shape
          ctx.fillStyle = p.color
          ctx.fillRect(-10, -5, 20, 10)
        }

        ctx.restore()
      }

      if (particles.length > 0) {
        animationRef.current = requestAnimationFrame(loop)
      } else {
        animationRef.current = null
      }
    }

    const handleEffectEvent = (e) => {
      if (localStorage.getItem('disableEffects') === 'true') return
      spawnParticles(e.detail)
    }

    window.addEventListener('room-effect', handleEffectEvent)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('room-effect', handleEffectEvent)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  )
}
