// URL parsing and source classification for shared playback.
// Keep this module dependency-free so heavy player libraries can stay in lazy chunks.

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
]

const VIMEO_PATTERN = /vimeo\.com\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|video\/)?(\d+)/
const PLAYABLE_EXTENSIONS = /\.(mp4|m4v|webm|ogv|ogg|mov|m3u8|mpd)(\?.*)?$/i
const PRIVATE_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])
const UNIVERSAL_HOSTS = [
  'twitch.tv',
  'clips.twitch.tv',
  'dailymotion.com',
  'dai.ly',
  'facebook.com',
  'soundcloud.com',
  'mixcloud.com',
  'wistia.com',
  'wistia.net',
  'vidyard.com',
  'kaltura.com',
]

function isPrivateIp(hostname) {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false
  const [a, b] = parts
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
}

function isSupportedUniversalHost(hostname) {
  return UNIVERSAL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
}

/**
 * @param {string} rawUrl
 * @returns {{ type: 'youtube' | 'vimeo' | 'direct' | 'universal' | 'external', id: string, url: string } | { type: 'unsupported', reason: string }}
 */
export function parseVideoUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim()

  if (!trimmed) return { type: 'unsupported', reason: 'Paste a video URL first.' }

  let url
  try {
    url = new URL(trimmed)
  } catch {
    return { type: 'unsupported', reason: "That doesn't look like a valid URL." }
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { type: 'unsupported', reason: 'Only http(s) links are supported.' }
  }

  if (url.username || url.password) {
    return { type: 'unsupported', reason: 'Links with embedded credentials are not supported.' }
  }

  const hostname = url.hostname.toLowerCase()
  if (PRIVATE_HOSTS.has(hostname) || isPrivateIp(hostname)) {
    return { type: 'unsupported', reason: 'Local network and private IP links are blocked for safety.' }
  }

  const normalized = url.toString()

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = normalized.match(pattern)
    if (match) return { type: 'youtube', id: match[1], url: normalized }
  }

  const vimeoMatch = normalized.match(VIMEO_PATTERN)
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1], url: normalized }

  if (PLAYABLE_EXTENSIONS.test(url.pathname)) return { type: 'direct', id: normalized, url: normalized }
  if (isSupportedUniversalHost(hostname)) return { type: 'universal', id: normalized, url: normalized }
  if (url.protocol === 'https:') return { type: 'external', id: normalized, url: normalized }

  return {
    type: 'unsupported',
    reason: 'This site cannot be embedded securely. Try a direct video link or an HTTPS watch page.',
  }
}

export const parseVideoUrlSync = parseVideoUrl
