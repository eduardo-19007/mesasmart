import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { predictMinutes, validateModel } from './inference.mjs';

export async function estimateShadow({ enabled, directory, baseline, quantity, onUnavailable = () => {} }) {
  if (!enabled) return undefined;
  try {
    const raw = await readFile(resolve(directory, 'model.json'), 'utf8');
    const metrics = JSON.parse(await readFile(resolve(directory, 'metrics.json'), 'utf8'));
    const model = validateModel(JSON.parse(raw));
    if (JSON.stringify(metrics.features) !== JSON.stringify(model.features) ||
        metrics.target !== 'minutes from confirmed_at to ready_at' ||
        !['SYNTHETIC_DEMONSTRATION', 'LOCAL_EXPORT_REQUIRES_PROVENANCE_REVIEW'].includes(metrics.provenance)) throw new Error('Contrato incompatible');
    return {
      mode: 'SHADOW', minutes: predictMinutes(model, baseline, quantity),
      baselineMinutes: baseline, quantity, provenance: metrics.provenance,
      modelSha256: createHash('sha256').update(raw).digest('hex'), operational: false,
    };
  } catch {
    onUnavailable();
    return undefined;
  }
}
