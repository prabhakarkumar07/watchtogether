import ReactPlayer from 'react-player'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

/**
 * Universal video engine using react-player.
 * Supports YouTube, Vimeo, Twitch, Facebook, Dailymotion, SoundCloud,
 * Wistia, Mixcloud, Vidyard, Kaltura, HLS (.m3u8), DASH (.mpd),
 * and direct file URLs (MP4, WebM, Ogg, etc.)
 *
 * Implements the same imperative interface as the other engine components:
 * getCurrentTime(), getDuration(), play(), pause(), seekTo(), setPlaybackRate(), setVolume()
 */
const ReactPlayerEngine = forwardRef(function ReactPlayerEngine(
  { url, onReady, onError, onEnded, onPlayStateChange },
  ref
) {
  const playerRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => Promise.resolve(playerRef.current?.getCurrentTime() ?? 0),
    getDuration: () => Promise.resolve(playerRef.current?.getDuration() ?? 0),
    play: () => {
      setPlaying(true)
      onPlayStateChange?.(true)
    },
    pause: () => {
      setPlaying(false)
      onPlayStateChange?.(false)
    },
    seekTo: (seconds) => playerRef.current?.seekTo(seconds, 'seconds'),
    setPlaybackRate: (rate) => {
      // react-player uses the playbackRate prop, so we trigger it via the internal player
      const internal = playerRef.current?.getInternalPlayer()
      if (internal && typeof internal.playbackRate !== 'undefined') {
        internal.playbackRate = rate
      }
    },
    setVolume: (vol) => {
      const internal = playerRef.current?.getInternalPlayer()
      if (internal && typeof internal.volume !== 'undefined') {
        internal.volume = vol
      }
    },
  }))

  return (
    <div className="h-full w-full">
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        width="100%"
        height="100%"
        controls={false}
        onReady={() => onReady?.()}
        onError={(e) => onError?.(`Could not load video: ${e?.message || 'Unknown error'}`)}
        onEnded={() => {
          setPlaying(false)
          onEnded?.()
        }}
        onPlay={() => {
          setPlaying(true)
          onPlayStateChange?.(true)
        }}
        onPause={() => {
          setPlaying(false)
          onPlayStateChange?.(false)
        }}
        config={{
          youtube: { playerVars: { controls: 0, modestbranding: 1 } },
          twitch: { options: { controls: false } },
        }}
      />
    </div>
  )
})

export default ReactPlayerEngine
