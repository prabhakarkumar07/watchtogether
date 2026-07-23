import { useRef } from 'react'

// effectId → emoji character
const EFFECT_EMOJI = {
  hearts:      '❤️',
  likes:       '👍',
  partypopper: '🎉',
  confetti:    '🎊',
  emojis:      '😊',
  fire:        '🔥',
  stars:       '⭐',
  sparkles:    '✨',
  petals:      '🌸',
  balloons:    '🎈',
  snow:        '❄️',
  rain:        '💧',
}

// Spread particles across tile width; stagger delays so they don't all start together
const LEFTS  = [15, 30, 50, 65, 78, 42]
const DELAYS = [0, 90, 180, 45, 135, 220]
const SCALES = [1.0, 0.85, 1.15, 0.9, 1.1, 0.8]
const PARTICLE_COUNT = 6

export default function CameraReactionOverlay({ reactions }) {
  if (!reactions || reactions.length === 0) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position:      'absolute',
        inset:         0,
        pointerEvents: 'none',
        overflow:      'hidden',
        zIndex:        20,
      }}
    >
      {reactions.map((r) => (
        <ReactionBurst key={r.id} effectId={r.effectId} />
      ))}
    </div>
  )
}

function ReactionBurst({ effectId }) {
  const emoji = EFFECT_EMOJI[effectId] || '🎊'

  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <span
          key={i}
          className="cam-reaction-particle"
          style={{
            left:           `${LEFTS[i % LEFTS.length]}%`,
            bottom:         `${6 + (i % 3) * 5}%`,
            animationDelay: `${DELAYS[i % DELAYS.length]}ms`,
            fontSize:       `${1.15 * SCALES[i % SCALES.length]}rem`,
          }}
        >
          {emoji}
        </span>
      ))}
    </>
  )
}
