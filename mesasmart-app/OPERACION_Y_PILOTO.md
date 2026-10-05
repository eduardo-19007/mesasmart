# MesaSmart: operación, pruebas y piloto

Este documento convierte los pendientes en actividades verificables. Los campos de resultados deben completarse únicamente con evidencia obtenida. No hay resultados de piloto registrados todavía.

## Decisiones funcionales implementadas

### Cancelación y rechazo

- Cocina puede rechazar un pedido confirmado y debe escribir un motivo de 5 a 250 caracteres.
- Administración puede cancelar pedidos confirmados o en preparación desde la pantalla de cocina.
- El evento conserva estado anterior, estado nuevo, actor, fecha y motivo.
- El seguimiento del comensal muestra el estado terminal y el motivo.
- Atención no puede cancelar ni rechazar; cocina no puede cancelar. La API vuelve a comprobar el rol aunque se manipule la pantalla.

### Cambio de precio

El navegador envía el total que mostró. El servidor recalcula el pedido con los precios vigentes. Si difieren, no crea el pedido: actualiza la carta, muestra total anterior y nuevo y exige pulsar **Aceptar nuevo total y pedir**. La nueva confirmación usa otra clave de idempotencia.

### Renovación del QR

Política adoptada:

1. Regenerar un QR cierra la sesión anterior para pedidos nuevos.
2. Un pedido ya registrado conserva seguimiento con el token que lo creó hasta la caducidad original.
3. El token anterior no permite añadir otro pedido ni consultar pedidos de otra sesión.
4. Al vencer el token se solicita ayuda al personal. Un cambio global de QR_SIGNING_SECRET invalida todos los accesos y se reserva para incidentes o rotación planificada.

Para un restaurante que quiera imprimir el mismo QR durante meses se recomienda una evolución posterior: QR identificador estable, apertura de visita independiente y cierre de visita por el personal. No debe mezclarse esa modalidad con el acceso temporal actual sin rediseñar el modelo de amenaza.

## Prueba de aceptación en teléfonos y con personal

Participantes mínimos: un ADMIN, una persona de KITCHEN, una de WAITER y dos teléfonos de comensal. Usar una base de prueba y productos identificables. No usar datos personales reales en capturas.

| ID | Dispositivo/rol | Procedimiento | Criterio de aceptación | Resultado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| M01 | Teléfono A | Escanear QR y abrir carta | Mesa correcta, texto legible, sin desplazamiento horizontal | Pendiente | |
| M02 | Teléfono A | Crear pedido y pulsar dos veces | Se crea un solo pedido | Pendiente | |
| M03 | KITCHEN + teléfono A | Preparar y marcar listo | Estado del teléfono cambia en máximo 10 s | Pendiente | |
| M04 | KITCHEN | Rechazar con motivo | Sale de cocina y el motivo aparece al cliente | Pendiente | |
| M05 | ADMIN | Cancelar durante preparación | Queda actor y motivo; cliente lo ve | Pendiente | |
| M06 | WAITER | Entregar y cerrar | Sale de pendientes y conserva eventos | Pendiente | |
| M07 | ADMIN + teléfono A | Regenerar QR con pedido abierto | Seguimiento continúa; nuevo pedido con QR anterior falla | Pendiente | |
| M08 | ADMIN + teléfono B | Cambiar precio con carrito abierto | Se presenta y exige confirmar el nuevo total | Pendiente | |
| M09 | Teléfono A | Cortar red durante envío y reintentar | Mensaje claro y ningún duplicado | Pendiente | |
| M10 | Todos | Navegar solo con teclado y lector básico | Foco visible, controles nombrados y mensajes anunciados | Pendiente | |

Registrar marca/modelo, sistema operativo, navegador, resolución, red, fecha, responsable, incidencia y decisión. Una captura no reemplaza la observación del resultado en la base.

### Evidencia técnica ejecutada el 27 de septiembre de 2026

- Emulación responsive del navegador a 390 x 844 px: login, panel, carta, carrito, registro, seguimiento, cocina y diálogo de rechazo sin desbordamiento horizontal observado.
- Pedido temporal MS-1049: registrado con Chicha morada, visible en seguimiento, rechazado desde cocina con motivo y retirado de la cola.
- Los registros temporales de usuario, mesa, sesión, pedido y eventos se eliminaron al finalizar la prueba.
- Esta comprobación es técnica y emulada. Las filas M01-M10 continúan como pendientes hasta ejecutarse en teléfonos físicos y con participantes reales.

## Despliegue controlado

1. Crear entornos separados de prueba y producción con PostgreSQL soportado.
2. Configurar HTTPS, dominio, APP_URL público, RESTAURANT_SLUG y secretos diferentes administrados fuera del repositorio.
3. Aplicar las siete migraciones con `node scripts/migrate.mjs` antes de publicar la aplicación.
4. Ejecutar `npm run lint`, `npm run build` y la integración contra el entorno de prueba.
5. Comprobar `GET /api/health`; debe responder 200 con aplicación y base disponibles. El monitor externo no debe incluir credenciales ni token QR.
6. Configurar alertas: tres fallos consecutivos, respuesta p95 mayor al umbral acordado, errores 5xx y uso de almacenamiento de PostgreSQL.
7. Publicar primero para personal interno, observar un turno, luego habilitar un número limitado de mesas.
8. Documentar reversión de versión y responsable de la decisión. Las migraciones actuales no incluyen reversión destructiva automática.

No se ha elegido ni configurado un proveedor Cloud en esta revisión. La selección depende de presupuesto, región, soporte y política institucional.

## Respaldo y restauración

Con `DATABASE_URL` cargada en la sesión y PostgreSQL Client Tools instalado:

```powershell
./scripts/backup-database.ps1 -OutputPath "./backups/mesasmart-AAAA-MM-DD.backup"
```

La existencia del archivo no prueba recuperabilidad. Cada mes, restaurar una copia en una base vacía de prueba con pgAdmin o `pg_restore`, ejecutar migraciones y comprobar conteos, pedidos, eventos y acceso. Registrar duración, tamaño, responsable, RPO y RTO. Nunca probar restauración sobre producción.

## Prueba de carga

El script incluido solo realiza lecturas y por defecto consulta la carta:

```powershell
$env:LOAD_TEST_URL="https://entorno-de-prueba.example"
$env:LOAD_TEST_REQUESTS="500"
$env:LOAD_TEST_CONCURRENCY="20"
node scripts/load-test.mjs
Remove-Item Env:LOAD_TEST_URL,Env:LOAD_TEST_REQUESTS,Env:LOAD_TEST_CONCURRENCY
```

Registrar p50, p95, p99, solicitudes por segundo, errores, CPU, memoria y conexiones de base. Ejecutarlo únicamente contra un entorno propio autorizado. Para escritura se necesita otro guion con datos aislados y limpieza explícita; este script no genera pedidos.

Resultado local exploratorio del 27 de septiembre de 2026: 50 solicitudes a `/api/menu`, concurrencia 5, 50 respuestas HTTP 200, 20.08 solicitudes/s, p50 181 ms, p95 591 ms y p99 638 ms. Es una comprobación corta sobre el equipo de desarrollo, no una capacidad prometida de producción. No se midieron CPU, memoria ni conexiones en esta ejecución.

La comprobación local de `/api/health` respondió HTTP 200 con aplicación y base disponibles; el tiempo observado fue 37 ms. Esta medición aislada no representa disponibilidad mensual.

## Protocolo del piloto académico

Diseño previsto por el proyecto: comparar línea base y uso de MesaSmart. Las metas de 120 pedidos antes y 120 con sistema, 30-50 comensales y 6-12 colaboradores son objetivos de recolección, no resultados existentes.

Antes de iniciar:

1. Obtener autorización del restaurante y aprobación docente; definir consentimiento y anonimización.
2. Congelar versión, instrumentos y definiciones de inicio/fin de tiempo.
3. Asignar códigos anónimos; no registrar nombres, teléfonos ni datos de pago.
4. Separar pedidos de ensayo, línea base y piloto.
5. Definir exclusiones antes de observar resultados: abandono, caída total, pedido de prueba y registro incompleto.

Variables mínimas: modalidad, fecha/hora, mesa codificada, cantidad de productos, hora de registro, confirmación, preparación, listo, entrega, cierre, estado final, motivo de excepción, error de captura, satisfacción y rol del encuestado.

Análisis mínimo: tamaño final, faltantes, mediana y rango intercuartílico de tiempos, tasa de errores/cancelaciones, intervalo de confianza cuando corresponda y comparación con la línea base. Reportar contexto y limitaciones. No atribuir causalidad ni mejora porcentual sin diseño y evidencia suficientes.

### Componente predictivo

La estimación actual es una regla configurada a partir de los minutos base de los productos. Debe llamarse **estimación inicial**, no inteligencia artificial. Para justificar un modelo posterior se requiere un conjunto de datos suficiente, división temporal de entrenamiento/prueba, línea base sencilla, métrica predefinida (por ejemplo MAE) y evaluación fuera de muestra. La meta de mejora debe permanecer como hipótesis hasta medirse.

## Actualización del documento académico

Redacción válida hoy:

> Se implementó y verificó localmente un MVP de pedidos por QR con control de acceso, idempotencia, seguimiento, roles operativos, excepciones motivadas y persistencia PostgreSQL. La verificación automatizada no sustituye el piloto. La estimación de espera es configurada y todavía no corresponde a un modelo de inteligencia artificial entrenado.

No redactar todavía “se redujo el tiempo”, “mejoró la satisfacción”, “alcanzó disponibilidad” o “la IA predice” sin completar las tablas del piloto y adjuntar evidencia. Al terminar el trabajo de campo, sustituir resultados previstos por valores observados, actualizar discusión, limitaciones, conclusiones y anexar instrumentos anonimizados.
