const crypto = require('crypto');

const SCRYPT_PREFIX = 'scrypt:';

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}${salt}:${hash}`;
}

function verifyPassword(plain, stored) {
  if (!stored) return false;

  if (stored.startsWith(SCRYPT_PREFIX)) {
    const [, salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
  }

  // Comptes seed / legacy (mot de passe en clair)
  return plain === stored;
}

module.exports = { hashPassword, verifyPassword };
