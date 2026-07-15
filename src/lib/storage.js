// Centralized localStorage keys and safe read/write helpers.
// Wrapping every access in try/catch protects the app from private-mode
// browsers or storage quota errors, which would otherwise crash the app.

export const STORAGE_KEYS = {
  USERNAME: 'wt_username',
  THEME: 'wt_theme',
  LAST_ROOM: 'wt_last_room',
  RECENT_VIDEOS: 'wt_recent_videos',
  VOLUME: 'wt_volume',
  PLAYBACK_SPEED: 'wt_playback_speed',
  MIC_STATE: 'wt_mic_state',
  CAM_STATE: 'wt_cam_state',
  WAS_IN_CALL: 'wt_was_in_call',
  WAS_HOST: 'wt_was_host',
  VIDEO_STATE: 'wt_video_state',
  CHAT_HISTORY: 'wt_chat_history',
}

export function readStorage(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Storage might be full or unavailable (e.g. Safari private mode) —
    // fail silently so the app keeps working without persistence.
    return false
  }
}

export function addRecentVideo(url) {
  const list = readStorage(STORAGE_KEYS.RECENT_VIDEOS, [])
  const deduped = [url, ...list.filter((item) => item !== url)].slice(0, 8)
  writeStorage(STORAGE_KEYS.RECENT_VIDEOS, deduped)
  return deduped
}
