# Experimento de estimación de MesaSmart

Implementación: scikit-learn 1.7.2, StandardScaler + regresión Ridge. Objetivo:
minutos entre confirmación y pedido listo, no tiempo desde llegada ni entrega.
Variables disponibles al confirmar: minutos base y cantidad total de unidades.
No se usan ready_at, duración ni estados futuros como predictores.

## Reproducción

Desde mesasmart-app, con Python 3.12 y Node 22 disponibles:

```powershell
python -m pip install --target .ml-deps -r ml/requirements.txt
python ml/train.py --demo
node scripts/export-ml-data.mjs
python ml/train.py --csv ml/data/observed.csv --output ml/results/observed
```

La exportación del 28/09/2026 encontró **0 registros elegibles**. No hay evidencia
de evaluación con pedidos reales. El exportador excluye cancelados/rechazados,
no incluye nombres, observaciones ni identificadores, y exige tiempos positivos.
Un responsable debe excluir ensayos y registrar autorización/procedencia antes de entrenar.
No usar como baseline una estimación ML futura: el contrato actual presupone la regla configurada.

La demostración genera 240 filas sintéticas con semilla 42851; 144 entrenamiento,
48 validación y 48 prueba, en orden temporal. Fechas iguales no cruzan particiones.
Se selecciona alpha exclusivamente con validación. El test se usa una vez para
comparar MAE/RMSE y regla base. El mínimo de 60 registros es un control técnico,
no una justificación estadística ni requisito del sílabo.

Resultados: `results/demo/metrics.json`, `model.json`, `predictions.csv`.
El modelo portable se verifica contra sklearn con tolerancia 1e-8. Su inferencia
es intercepto + suma de coeficiente * (variable-media)/escala, limitada a un minuto.
No cargar archivos pickle de fuentes desconocidas.

## Restricciones

El experimento está entrenado y evaluado sobre datos artificiales; no acredita
precisión operativa, impacto causal ni validación del restaurante. La aplicación
mantiene la regla de minutos base. La promoción requiere datos reales autorizados,
análisis por turno, comparación fuera de muestra, revisión de errores/outliers,
aprobación del equipo y pruebas de integración. No activar automáticamente por
una mejora en datos generados por la misma fórmula de demostración.
