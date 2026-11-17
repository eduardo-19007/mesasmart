import assert from 'node:assert/strict';
import test from 'node:test';
import { createIdempotencyKey } from '../src/lib/idempotency.ts';

test('Claves de pedido en HTTPS y HTTP local', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const install = value => Object.defineProperty(globalThis, 'crypto', { configurable: true, value });
  try {
    await t.test('Utiliza randomUUID si está disponible', () => {
      install({ randomUUID: () => '7380e239-d357-4ff6-ae48-d270cbddfa79' });
      assert.equal(createIdempotencyKey(), '7380e239-d357-4ff6-ae48-d270cbddfa79');
    });
    await t.test('HTTP sin randomUUID genera UUID v4 con bytes aleatorios', () => {
      let calls = 0;
      install({ getRandomValues: bytes => { calls++; bytes.fill(255); return bytes; } });
      assert.equal(createIdempotencyKey(), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
      assert.equal(calls, 1);
    });
    await t.test('No envía claves débiles si el navegador carece de aleatoriedad', () => {
      install(undefined);
      assert.throws(createIdempotencyKey, /navegador actualizado/);
    });
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete globalThis.crypto;
  }
});
