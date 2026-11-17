import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { estimateShadow } from '../ml/shadow-estimation.mjs';

test('Inferencia experimental y recuperación ante artefactos inválidos', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'mesasmart-ml-'));
  const model = { features: ['baseline_minutes', 'quantity'], means: [10, 2], scales: [2, 1], coefficients: [4, 3], intercept: 12 };
  const metrics = { features: model.features, target: 'minutes from confirmed_at to ready_at', provenance: 'SYNTHETIC_DEMONSTRATION' };
  const options = { enabled: true, directory, baseline: 12, quantity: 3 };
  const save = async (m = model, report = metrics) => {
    await writeFile(join(directory, 'model.json'), JSON.stringify(m));
    await writeFile(join(directory, 'metrics.json'), JSON.stringify(report));
  };
  try {
    await t.test('Desactivado sin archivos', async () => assert.equal(await estimateShadow({ ...options, enabled: false }), undefined));
    await t.test('Modelo ausente conserva regla', async () => assert.equal(await estimateShadow(options), undefined));
    await save();
    await t.test('Predicción conocida y versión', async () => {
      const result = await estimateShadow(options);
      assert.equal(result.minutes, 19);
      assert.equal(result.operational, false);
      assert.equal(result.baselineMinutes, 12);
      assert.match(result.modelSha256, /^[a-f0-9]{64}$/);
    });
    await t.test('JSON dañado conserva regla', async () => {
      await writeFile(join(directory, 'model.json'), '{');
      assert.equal(await estimateShadow(options), undefined);
    });
    await t.test('Escala inválida conserva regla', async () => {
      await save({ ...model, scales: [0, 1] });
      assert.equal(await estimateShadow(options), undefined);
    });
    await t.test('Variable objetivo incompatible conserva regla', async () => {
      await save(model, { ...metrics, target: 'delivery' });
      assert.equal(await estimateShadow(options), undefined);
    });
    await t.test('Procedencia desconocida conserva regla', async () => {
      await save(model, { ...metrics, provenance: 'UNKNOWN' });
      assert.equal(await estimateShadow(options), undefined);
    });
    await t.test('Orden de variables incompatible conserva regla', async () => {
      await save(model, { ...metrics, features: [...model.features].reverse() });
      assert.equal(await estimateShadow(options), undefined);
    });
    await t.test('Cantidad fraccionaria conserva regla', async () => {
      await save();
      assert.equal(await estimateShadow({ ...options, quantity: 1.5 }), undefined);
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
