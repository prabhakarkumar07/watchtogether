import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import Player from '@vimeo/player'

const VimeoEngine = forwardRef(function VimeoEngine(
  { videoId, onReady, onError, onEnded, onPlayStateChange },
  ref
) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause().catch(() => {}),
    seekTo: (time) => playerRef.current?.setCurrentTime(time).catch(() => {}),
    setPlaybackRate: (rate) => playerRef.current?.setPlaybackRate(rate).catch(() => {}),
    setVolume: (vol) => playerRef.current?.setVolume(vol).catch(() => {}),
    getCurrentTime: async () => {
      try {
        return (await playerRef.current?.getCurrentTime()) || 0
      } catch {
        return 0
      }
    },
    getDuration: async () => {
      try {
        return (await playerRef.current?.getDuration()) || 0
      } catch {
        return 0
      }
    },
    getElement: () => containerRef.current,
  }))

  useEffect(() => {
    const player = new Player(containerRef.current, {
      id: videoId,
      responsive: true,
      controls: false,
    })
    playerRef.current = player

    player.ready().then(() => onReady?.()).catch(() => onError?.('This Vimeo video is unavailable or cannot be embedded.'))
    player.on('play', () => onPlayStateChange?.(true))
    player.on('pause', () => onPlayStateChange?.(false))
    player.on('ended', () => onEnded?.())
    player.on('error', () => onError?.('This Vimeo video is unavailable or cannot be embedded.'))

    return () => {
      player.unload().catch(() => {})
      player.destroy().catch(() => {})
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full" />
})

export default VimeoEngine
