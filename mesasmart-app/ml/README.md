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
El CSV de predicciones incluye `quantity` para comprobar inferencia con las mismas
entradas. Después de entrenar, ejecutar `node scripts/verify-ml-inference.mjs`
(o añadir la carpeta de resultados como argumento). El evaluador comprueba cada
predicción frente a Python y rechaza artefactos y entradas incompatibles.
`ml/inference.mjs` contiene la inferencia portable. Con `ML_SHADOW_MODE=true`,
el registro de pedidos guarda una comparación experimental en el evento CONFIRMED:
predicción, referencia, cantidad, procedencia y SHA-256 del modelo. Por defecto está
desactivado. Los artefactos se cargan desde `ml/results/demo`.
Un archivo ausente o incompatible conserva el registro normal con la regla base.
La estimación visible y el exportador de entrenamiento conservan esa regla; el
resultado experimental no sustituye la validación operativa. No se registra una
segunda comparación al repetir una clave de idempotencia ya aceptada.
El modelo portable se verifica contra sklearn con tolerancia 1e-8. Su inferencia
es intercepto + suma de coeficiente * (variable-media)/escala, limitada a un minuto.
No cargar archivos pickle de fuentes desconocidas.

## Restricciones

`npm run test:ml` ejecuta nueve escenarios de inferencia y recuperación (el runner
cuenta también el contenedor, diez pruebas). No requiere PostgreSQL ni artefactos
previos; usa archivos temporales aislados que elimina al terminar.

El experimento está entrenado y evaluado sobre datos artificiales; no acredita
precisión operativa, impacto causal ni validación del restaurante. La aplicación
mantiene la regla de minutos base. La promoción requiere datos reales autorizados,
análisis por turno, comparación fuera de muestra, revisión de errores/outliers,
aprobación del equipo y pruebas de integración. No activar automáticamente por
una mejora en datos generados por la misma fórmula de demostración.
