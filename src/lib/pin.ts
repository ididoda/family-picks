import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

// Server-only. Format: scrypt$<saltHex>$<hashHex>
export function hashPin(pin: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(pin, salt, 64)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  const derived = scryptSync(pin, salt, 64)
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin)
}
