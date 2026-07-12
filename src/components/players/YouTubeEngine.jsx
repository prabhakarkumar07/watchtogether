import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { loadYouTubeApi } from '../../lib/youtubeApi.js'

const YouTubeEngine = forwardRef(function YouTubeEngine(
  { videoId, onReady, onError, onEnded, onPlayStateChange },
  ref
) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const destroyedRef = useRef(false)

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo?.(),
    pause: () => playerRef.current?.pauseVideo?.(),
    seekTo: (time) => playerRef.current?.seekTo?.(time, true),
    setPlaybackRate: (rate) => playerRef.current?.setPlaybackRate?.(rate),
    setVolume: (vol) => playerRef.current?.setVolume?.(Math.round(vol * 100)),
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() || 0,
    getDuration: () => playerRef.current?.getDuration?.() || 0,
    getElement: () => containerRef.current,
  }))

  useEffect(() => {
    destroyedRef.current = false
    let cancelled = false

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || destroyedRef.current) return
        playerRef.current = new YT.Player(containerRef.current, {
          videoId,
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            controls: 0,
          },
          events: {
            onReady: () => onReady?.(),
            onError: () => onError?.('This YouTube video is unavailable or cannot be embedded.'),
            onStateChange: (event) => {
              // 1 = playing, 2 = paused, 0 = ended
              if (event.data === 1) onPlayStateChange?.(true)
              if (event.data === 2) onPlayStateChange?.(false)
              if (event.data === 0) onEnded?.()
            },
          },
        })
      })
      .catch(() => onError?.('Could not load the YouTube player. Check your connection.'))

    return () => {
      cancelled = true
      destroyedRef.current = true
      try {
        playerRef.current?.destroy?.()
      } catch {
        /* player may already be gone */
      }
      playerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
      <div ref={containerRef} className="h-full w-full" />
      {/* Transparent overlay blocks YouTube's own click-to-play/pause so our
          unified control bar remains the single source of truth for input. */}
      <div className="absolute inset-0" />
    </div>
  )
})

export default YouTubeEngine
