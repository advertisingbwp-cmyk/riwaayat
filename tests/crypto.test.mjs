import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import {encryptPayload,decryptPayload} from '../src/crypto-payload.ts';

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
