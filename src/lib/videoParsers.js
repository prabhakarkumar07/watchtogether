// Detects the video source type from a pasted URL and extracts whatever
// identifier the corresponding player needs (YouTube video ID, Vimeo ID,
// or the raw file URL for direct playback).

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
]

const VIMEO_PATTERN = /vimeo\.com\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|video\/)?(\d+)/

const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i

/**
 * @param {string} rawUrl
 * @returns {{ type: 'youtube' | 'vimeo' | 'direct', id: string, url: string } | { type: 'unsupported', reason: string }}
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

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      return { type: 'youtube', id: match[1], url: trimmed }
    }
  }

  const vimeoMatch = trimmed.match(VIMEO_PATTERN)
  if (vimeoMatch) {
    return { type: 'vimeo', id: vimeoMatch[1], url: trimmed }
  }

  if (DIRECT_VIDEO_EXTENSIONS.test(url.pathname)) {
    return { type: 'direct', id: trimmed, url: trimmed }
  }

  return {
    type: 'unsupported',
    reason:
      "This link isn't a direct MP4/WebM file, YouTube, or Vimeo video — or it may not allow embedding.",
  }
}
