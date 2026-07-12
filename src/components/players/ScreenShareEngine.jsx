import { useEffect, useRef } from 'react'

export default function ScreenShareEngine({ stream, isLocal, onReady }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      // Some browsers block autoplay, so we try to play it explicitly
      videoRef.current.play().catch(err => {
        console.warn("Screen share autoplay blocked:", err)
      })
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      onLoadedMetadata={() => onReady?.()}
      className="h-full w-full object-contain"
    />
  )
}
