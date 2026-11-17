import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { predictMinutes, validateModel } from '../ml/inference.mjs';

const folder = resolve(process.argv[2] ?? 'ml/results/demo');
const model = validateModel(JSON.parse(await readFile(resolve(folder, 'model.json'), 'utf8')));
const metrics = JSON.parse(await readFile(resolve(folder, 'metrics.json'), 'utf8'));
assert.deepEqual(metrics.features, model.features);
const csv = (await readFile(resolve(folder, 'predictions.csv'), 'utf8')).trim().split(/\r?\n/);
assert.equal(csv.shift(), 'created_at,actual_minutes,baseline_minutes,quantity,predicted_minutes');
let maximumError = 0;
for (const line of csv) {
  const [, , baselineText, quantityText, expectedText] = line.split(',');
  const baseline = Number(baselineText), expected = Number(expectedText);
  const error = Math.abs(predictMinutes(model, baseline, Number(quantityText)) - expected);
  assert.ok(error < 1e-8, 'Inferencia incompatible con la referencia Python');
  maximumError = Math.max(maximumError, error);
}
assert.equal(csv.length, metrics.counts.test);
assert.throws(() => validateModel({ ...model, scales: [0, 1] }));
assert.throws(() => validateModel({ ...model, features: [...model.features].reverse() }));
assert.throws(() => predictMinutes(model, Infinity, 1));
assert.throws(() => predictMinutes(model, 10, 1.5));
console.log(JSON.stringify({ status: 'PASS', rows: csv.length, maximumError, operationalPromotion: false }));
