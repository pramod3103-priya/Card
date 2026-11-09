import crypto from 'crypto';

// Characters excluding ambiguous 0, O, 1, I, L
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates a random 6-character room code.
 * @returns {string} 6-character uppercase string
 */
export function generateRoomCode() {
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

/**
 * Generates a secure random reconnect token.
 * @returns {string}
 */
export function generateToken() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

/**
 * Sanitizes and validates a player name.
 * @param {string} rawName
 * @returns {string} Sanitized name or fallback
 */
export function sanitizePlayerName(rawName) {
  if (typeof rawName !== 'string') return 'Player';
  const trimmed = rawName.trim().replace(/[<>]/g, '');
  if (!trimmed) return 'Player';
  return trimmed.slice(0, 20);
}

/**
 * Validates room code format (6 alphanumeric characters).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidRoomCode(code) {
  if (typeof code !== 'string') return false;
  return /^[A-Z0-9]{6}$/.test(code.toUpperCase());
}

