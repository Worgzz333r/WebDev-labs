import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// TOTP за RFC 6238 (HMAC-SHA1, 6 цифр, крок 30 с) без зовнішніх залежностей.
// Сумісний з Google Authenticator, Microsoft Authenticator, Authy.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(text) {
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of text.replace(/=+$/, '').toUpperCase()) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Некоректний base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(key, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 1_000_000).padStart(6, '0');
}

export function generateSecret() {
  return base32Encode(randomBytes(20));
}

export function generateTotp(secret, time = Date.now()) {
  return hotp(base32Decode(secret), Math.floor(time / 1000 / STEP_SECONDS));
}

// Допускає зсув годинника на ±1 крок (±30 с)
export function verifyTotp(secret, code, time = Date.now(), window = 1) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(time / 1000 / STEP_SECONDS);
  const given = Buffer.from(code);

  for (let shift = -window; shift <= window; shift += 1) {
    if (timingSafeEqual(Buffer.from(hotp(key, counter + shift)), given)) return true;
  }
  return false;
}

export function otpauthUrl({ secret, email, issuer = 'Attendance API' }) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}