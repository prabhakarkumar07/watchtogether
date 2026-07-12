import { useEffect, useRef } from 'react'

export default function ScreenShareEngine({ stream, isLocal, volume, onReady }) {
  const videoRef = useRef(null)
  const readyCalledRef = useRef(false)

  useEffect(() => {
    readyCalledRef.current = false
  }, [])

  const callReady = () => {
    if (!readyCalledRef.current) {
      readyCalledRef.current = true
      onReady?.()
    }
  }

  // Apply volume changes to the video element (for receiver)
  useEffect(() => {
    if (videoRef.current && !isLocal) {
      videoRef.current.volume = volume ?? 1
    }
  }, [volume, isLocal])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return

    video.srcObject = stream

    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Screen share play() blocked:', err)
      })
    }

    // Fallback: if loadedmetadata doesn't fire within 2s, call onReady anyway
    const fallbackTimer = setTimeout(() => callReady(), 2000)

    const handleMetadata = () => {
      clearTimeout(fallbackTimer)
      callReady()
    }

    video.addEventListener('loadedmetadata', handleMetadata)

    return () => {
      clearTimeout(fallbackTimer)
      video.removeEventListener('loadedmetadata', handleMetadata)
    }
  }, [stream]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!stream) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        <p className="text-sm">Waiting for screen share stream…</p>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="h-full w-full object-contain"
    />
  )
}
