import { useEffect, useRef } from 'react'

export default function ScreenShareEngine({ stream, onReady }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      onReady?.()
    }
  }, [stream, onReady])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="h-full w-full object-contain"
    />
  )
}
