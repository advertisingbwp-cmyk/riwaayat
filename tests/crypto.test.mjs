import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

// Polyfill global crypto for Node test if needed
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Minimal implementation matching src/crypto-payload.ts for standalone Node test
function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}
function fromBase64(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}

async function deriveKey(passcode, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPayload(passcode, payload) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passcode, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return {
    version: 1,
    ciphertext: toBase64(new Uint8Array(ciphertextBuffer)),
    salt: toBase64(salt),
    iv: toBase64(iv),
  };
}

async function decryptPayload(passcode, payload) {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const key = await deriveKey(passcode, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}

test('PBKDF2 + AES-GCM encrypts and decrypts with correct passcode', async () => {
  const sample = { couple: 'Ali & Sarah', venue: 'Bahawalpur Club', secret: true };
  const encrypted = await encryptPayload('MySecretPass123!', sample);

  assert.equal(encrypted.version, 1);
  assert.ok(encrypted.ciphertext.length > 20);
  assert.ok(encrypted.salt.length > 10);
  assert.ok(encrypted.iv.length > 10);

  const decrypted = await decryptPayload('MySecretPass123!', encrypted);
  assert.deepEqual(decrypted, sample);
});

test('PBKDF2 + AES-GCM rejects incorrect passcode cryptographically', async () => {
  const sample = { couple: 'Ali & Sarah', venue: 'Bahawalpur Club' };
  const encrypted = await encryptPayload('CorrectPasscode99', sample);

  await assert.rejects(
    () => decryptPayload('WrongPasscode00', encrypted),
    /operation failed|tag mismatch|OperationError/i
  );
});
