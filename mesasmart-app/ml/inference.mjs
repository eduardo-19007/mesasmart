const features = ['baseline_minutes', 'quantity'];

export function validateModel(model) {
  if (!model || JSON.stringify(model.features) !== JSON.stringify(features)) throw new Error('Variables del modelo incompatibles');
  for (const key of ['means', 'scales', 'coefficients']) {
    if (!Array.isArray(model[key]) || model[key].length !== 2 || !model[key].every(Number.isFinite)) throw new Error(`Parámetros inválidos: ${key}`);
  }
  if (!model.scales.every(value => value > 0) || !Number.isFinite(model.intercept)) throw new Error('Escala o intercepto inválido');
  return model;
}

export function predictMinutes(model, baselineMinutes, quantity) {
  validateModel(model);
  if (!Number.isFinite(baselineMinutes) || baselineMinutes <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Entradas inválidas');
  const values = [baselineMinutes, quantity];
  const prediction = model.intercept + values.reduce((sum, value, index) => sum + (value - model.means[index]) / model.scales[index] * model.coefficients[index], 0);
  if (!Number.isFinite(prediction)) throw new Error('Predicción no finita');
  return Math.max(1, prediction);
}
