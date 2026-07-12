/**
 * End-to-end encryption for Watch Together data channels.
 *
 * Uses the Web Crypto API (SubtleCrypto) — available in all modern browsers.
 *
 * Key derivation:
 *   PBKDF2(roomCode, fixed-salt, 100k iterations, SHA-256) → AES-GCM-256 key
 *
 * The room code is the only shared secret between peers. Because every
 * participant must know the room code to join, all members can independently
 * derive the same key without exchanging it through the network.
 *
 * Note: WebRTC MediaConnections (video call, screen share) are already
 * encrypted at the transport layer with DTLS-SRTP, which is mandatory by the
 * WebRTC specification. This module adds application-level encryption on top
 * of the DataChannel so that message content is opaque even to the PeerJS
 * signaling server and any TURN relay.
 */

const SALT = new TextEncoder().encode('watch-together-e2ee-salt-v1')
const PBKDF2_ITERATIONS = 100_000
const ENC_MARKER = '__e2ee__'

/**
 * Derives a 256-bit AES-GCM key from a room code.
 * @param {string} roomCode
 * @returns {Promise<CryptoKey>}
 */
export async function deriveRoomKey(roomCode) {
  const raw = new TextEncoder().encode(roomCode.toUpperCase().trim())
  const keyMaterial = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts a plain JS object and returns a serializable envelope.
 * @param {CryptoKey} key
 * @param {object} data
 * @returns {Promise<{ __e2ee__: true, iv: number[], ct: number[] }>}
 */
export async function encryptPayload(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    [ENC_MARKER]: true,
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ciphertext)),
  }
}

/**
 * Decrypts an envelope produced by encryptPayload.
 * @param {CryptoKey} key
 * @param {{ iv: number[], ct: number[] }} envelope
 * @returns {Promise<object>}
 */
export async function decryptPayload(key, envelope) {
  const iv = new Uint8Array(envelope.iv)
  const ct = new Uint8Array(envelope.ct)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(plaintext))
}

/** Returns true if the given object is an encrypted envelope. */
export function isEncrypted(data) {
  return data && typeof data === 'object' && data[ENC_MARKER] === true
}
