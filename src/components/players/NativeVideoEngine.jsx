import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

/**
 * Wraps a plain <video> element for direct MP4/WebM/Ogg URLs and exposes the
 * same imperative surface (play/pause/seekTo/setPlaybackRate/getCurrentTime/
 * getDuration) that the YouTube and Vimeo engines expose, so VideoPlayer can
 * treat all three sources identically.
 */
const NativeVideoEngine = forwardRef(function NativeVideoEngine(
  { url, onReady, onError, onEnded, onPlayStateChange },
  ref
) {
  const videoRef = useRef(null)

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play().catch(() => {}),
    pause: () => videoRef.current?.pause(),
    seekTo: (time) => {
      if (videoRef.current) videoRef.current.currentTime = time
    },
    setPlaybackRate: (rate) => {
      if (videoRef.current) videoRef.current.playbackRate = rate
    },
    setVolume: (vol) => {
      if (videoRef.current) videoRef.current.volume = vol
    },
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getDuration: () => videoRef.current?.duration || 0,
    getElement: () => videoRef.current,
  }))

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const handleLoaded = () => onReady?.()
    const handleError = () => onError?.('This video file could not be loaded. It may be missing or blocked by the host.')
    const handleEnded = () => onEnded?.()
    const handlePlay = () => onPlayStateChange?.(true)
    const handlePause = () => onPlayStateChange?.(false)

    el.addEventListener('loadedmetadata', handleLoaded)
    el.addEventListener('error', handleError)
    el.addEventListener('ended', handleEnded)
    el.addEventListener('play', handlePlay)
    el.addEventListener('pause', handlePause)
    return () => {
      el.removeEventListener('loadedmetadata', handleLoaded)
      el.removeEventListener('error', handleError)
      el.removeEventListener('ended', handleEnded)
      el.removeEventListener('play', handlePlay)
      el.removeEventListener('pause', handlePause)
    }
  }, [url, onReady, onError, onEnded, onPlayStateChange])

  return (
    <video
      ref={videoRef}
      src={url}
      className="h-full w-full rounded-lg bg-black object-contain"
      playsInline
      controls={false}
    />
  )
})

export default NativeVideoEngine
