import { customAlphabet } from 'nanoid'

// Alphabet avoids visually ambiguous characters (0/O, 1/I/L) so room codes
// are easy to read aloud or type on a phone keyboard.
const generateCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6)

const PEER_ID_PREFIX = 'watch-together-'

export function createRoomCode() {
  return generateCode()
}

/** Every host's PeerJS id is deterministically derived from the room code,
 * so joiners can dial the host directly without any signaling server of our own. */
export function roomCodeToPeerId(roomCode) {
  return `${PEER_ID_PREFIX}${roomCode.trim().toUpperCase()}`
}

export function normalizeRoomCode(input) {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}

/** Friendly copy for PeerJS error types. See peerjs docs for the full enum. */
export function describePeerError(err) {
  const type = err?.type || err?.message || 'unknown'
  switch (type) {
    case 'peer-unavailable':
      return "That room code doesn't exist, or the host has left."
    case 'network':
      return 'Network interruption — check your connection and try again.'
    case 'unavailable-id':
      return 'That room code is currently in use. Please try again.'
    case 'browser-incompatible':
      return "Your browser doesn't support the WebRTC features this app needs. Try an up-to-date Chrome, Firefox, Edge, or Safari."
    case 'disconnected':
      return 'Lost connection to the signaling server. Reconnecting…'
    case 'server-error':
      return 'Could not reach the connection server. Please try again shortly.'
    case 'webrtc':
      return 'A WebRTC connection error occurred.'
    default:
      return 'Something went wrong with the connection. Please try again.'
  }
}
