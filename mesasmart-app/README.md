# MesaSmart

MVP local de pedidos por QR con PostgreSQL, Next.js, React y TypeScript.
La revision detallada esta en [REVISION_Y_PENDIENTES.md](REVISION_Y_PENDIENTES.md). El protocolo operativo, pruebas en telefonos, despliegue, respaldo, carga y piloto se encuentra en [OPERACION_Y_PILOTO.md](OPERACION_Y_PILOTO.md).

## Preparacion

1. Instalar las dependencias con el gestor del proyecto: `pnpm install`.
2. Crear `.env.local` a partir de `.env.example`, configurar PostgreSQL y mantener `DEMO_MODE=false`.
3. Generar por separado dos secretos aleatorios: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Usar uno en `QR_SIGNING_SECRET` y otro en `AUTH_SESSION_SECRET`.
4. Ejecutar `node scripts/migrate.mjs`: aplica siete migraciones pendientes sin repetir las existentes.
5. Crear un administrador siguiendo [la guia de pgAdmin](database/GUIA_PGADMIN4.md).
6. Ejecutar `npm run dev` y abrir http://localhost:3000.

Si las dependencias ya estan instaladas, los comandos `npm run` y `node scripts/...` no necesitan pnpm. No genere un segundo archivo de bloqueo con otro gestor.

## Rutas y roles

| Ruta | Uso |
| --- | --- |
| /login | Acceso del personal |
| /mesa/M01?token=... | Carta, pedido y seguimiento mediante enlace QR vigente |
| /cocina | Cocina y administrador: preparacion y pedido listo |
| /atencion | Atencion y administrador: entrega y cierre |
| /admin | Indicadores operativos reales |
| /admin/mesas | Generacion y descarga de QR |
| /admin/productos | Alta, edicion y disponibilidad de productos |
| /admin/personal | Gestion de usuarios y restablecimiento de contrasenas |

El QR se genera desde administracion. Abrir /mesa/M01 sin token no concede acceso en modo real.
Una nueva sesion QR bloquea pedidos nuevos con el acceso anterior; el seguimiento de pedidos ya creados continua hasta su vencimiento. Rotar QR_SIGNING_SECRET invalida todos los QR previos.
APP_URL debe ser una direccion accesible desde el telefono; localhost solo funciona en el propio equipo.

## Comportamiento verificado

- Persistencia transaccional, idempotencia de pedidos y control de cambios de estado concurrentes.
- Sesiones QR persistidas y revocables; consulta de pedidos limitada a su mesa o personal autorizado.
- Usuarios delimitados al restaurante configurado en RESTAURANT_SLUG.
- Contrasenas almacenadas como hashes scrypt; cookies firmadas HttpOnly y validacion del usuario en cada solicitud.
- Cambiar rol, contrasena o estado del personal invalida sesiones anteriores. Cerrar sesion invalida sus cookies existentes.
- Indicadores calculados desde pedidos reales; sin porcentajes de satisfaccion o disponibilidad inventados.
- Cancelacion administrativa y rechazo de cocina con motivo visible para el cliente.
- Reconfirmacion obligatoria cuando el precio vigente difiere del mostrado en el carrito.
- Regenerar un QR bloquea pedidos nuevos con el acceso anterior, pero conserva el seguimiento de pedidos ya registrados hasta su vencimiento.
- Estimaciones iniciales configuradas, no un modelo de inteligencia artificial entrenado.
- DEMO_MODE=true solo habilita demostracion de carta/pedidos en desarrollo; no sustituye PostgreSQL para toda la administracion.

## Verificacion

Con PostgreSQL configurado, migraciones aplicadas y servidor activo:

```powershell
npm run lint
npm run build
node scripts/check-database.mjs
npm run test:integration
npm run test:load
```

Las pruebas de integracion crean y eliminan registros temporales por identificadores; ejecutarlas preferentemente en una base de pruebas. No se deben ejecutar contra produccion. Las secuencias pueden avanzar aunque se eliminen los registros. La prueba de carga es de solo lectura y tambien debe apuntar a un entorno propio de pruebas.
Resultado automatizado: qa/integration-results.json.
La suite necesita que el servidor use la misma base y configuracion que .env.local.

## Alcance

MVP probado localmente; no equivale a un despliegue productivo certificado.
Faltan evidencias de piloto, validacion academica y operacion Cloud. Consulte el informe de revision antes de presentar resultados como logrados.
