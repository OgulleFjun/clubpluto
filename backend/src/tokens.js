import crypto from 'crypto';

const doorAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomToken(bytes = 18) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function doorCode() {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (const byte of bytes) code += doorAlphabet[byte % doorAlphabet.length];
  return code;
}
