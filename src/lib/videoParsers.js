import ReactPlayer from 'react-player'

// Detects the video source type from a pasted URL and extracts whatever
// identifier the corresponding player needs (YouTube video ID, Vimeo ID,
// or the raw file URL for react-player / direct playback).
//
// react-player is used as a universal fallback and supports:
//   YouTube, Vimeo, Twitch, Facebook, Dailymotion, SoundCloud, Wistia,
//   Mixcloud, Vidyard, HLS (.m3u8), DASH (.mpd), and direct file URLs.

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
]

const VIMEO_PATTERN = /vimeo\.com\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|video\/)?([\d]+)/

/**
 * @param {string} rawUrl
 * @returns {{ type: 'youtube' | 'vimeo' | 'universal', id: string, url: string } | { type: 'unsupported', reason: string }}
 */
export function parseVideoUrl(rawUrl) {
  const trimmed = (rawUrl || '').trim()

  if (!trimmed) {
    return { type: 'unsupported', reason: 'Paste a video URL first.' }
  }

  let url
  try {
    url = new URL(trimmed)
  } catch {
    return { type: 'unsupported', reason: "That doesn't look like a valid URL." }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { type: 'unsupported', reason: 'Only http(s) links are supported.' }
  }

  // Check YouTube first (use native engine for best sync control)
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return { type: 'youtube', id: match[1], url: trimmed }
    }
  }

  // Check Vimeo (use native engine for best sync control)
  const vimeoMatch = trimmed.match(VIMEO_PATTERN)
  if (vimeoMatch) {
    return { type: 'vimeo', id: vimeoMatch[1], url: trimmed }
  }

  // Fall back to react-player for everything else:
  // Twitch, Dailymotion, Facebook, SoundCloud, HLS, DASH, MP4, WebM, etc.
  if (ReactPlayer.canPlay(trimmed)) {
    return { type: 'universal', id: trimmed, url: trimmed }
  }

  return {
    type: 'unsupported',
    reason:
      'This URL is not supported. Try YouTube, Vimeo, Twitch, Dailymotion, a direct .mp4/.m3u8 link, or use Screen Share for any other site.',
  }
}

// Alias for backward compatibility
export const parseVideoUrlSync = parseVideoUrl
