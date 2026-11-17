# Cierre Cloud, Scrum y piloto

Estado 28/09/2026: preparación de despliegue, no publicación. El Dockerfile no
constituye evidencia Cloud y todavía requiere construcción en un host con Docker.
No se ha elegido proveedor ni creado recursos que generen costos.

## Despliegue

1. Seleccionar proveedor autorizado con Node 22/contenedores y PostgreSQL, región,
   presupuesto, dominio y responsable. Registrar la decisión del Product Owner.
2. Preparar una base de ensayo separada de producción y una cuenta de aplicación
   con mínimo privilegio. Usar credenciales de migración solo durante despliegue.
3. Configurar secretos del proveedor: DATABASE_URL, AUTH_SESSION_SECRET y
   QR_SIGNING_SECRET distintos y aleatorios; DEMO_MODE=false, RESTAURANT_SLUG y
   APP_URL=https://dominio-autorizado. Nunca incorporarlos en imagen o repositorio.
4. Construir `docker build -t mesasmart:revision .`. Ejecutar migraciones una sola
   vez mediante `node scripts/migrate.mjs` en la imagen con entorno seguro. Revisar
   la semilla de ejemplo antes de habilitar usuarios. Crear administrador mediante
   `scripts/create-staff.mjs`; no publicar contraseñas ni QR en capturas.
5. Ejecutar la imagen tras proxy TLS del proveedor; bloquear acceso público a la
   base. Probar cookies Secure, permisos, recarga, precios, QR renovado y roles.
6. Monitor externo cada minuto sobre /api/health, alerta al responsable tras fallos
   consecutivos. Registrar ventanas observadas, indisponibilidad y mantenimiento.
   No inferir 99% de disponibilidad de una sola respuesta HTTP 200.
7. Respaldar con pg_dump en formato custom y restaurar en base aislada vacía con
   pg_restore --no-owner. Verificar migraciones, conteos, relaciones y recorrido
   de pedido. Registrar duración, hash, responsable y resultado. No restaurar sobre
   la base operativa ni incluir secretos en la evidencia académica.
8. Medir carga representativa con lecturas y escrituras aisladas; definir antes
   concurrencia esperada y umbrales. Conservar logs, CPU, memoria y conexiones.
9. Publicar solo tras aceptación y autorización. Retener imagen anterior y plan
   de reversión compatible con migraciones; ensayar en staging.

## Evidencia mínima a completar

| Evidencia | Registro requerido | Estado |
| --- | --- | --- |
| Cloud | URL HTTPS, fecha, versión, proveedor, salud y pruebas sin secretos | Pendiente |
| Restauración | Backup identificado, base destino aislada, conteos y ensayo | Pendiente |
| Sprint Review | Fecha real, asistentes, incremento, criterios aceptados y observaciones | Pendiente |
| Retrospectiva | Problema observado, acción, responsable y seguimiento | Pendiente |
| Piloto | Autorización, establecimiento, turnos, muestra real, incidencias | Pendiente |
| Usabilidad | Rol, teléfono físico, red, tarea, éxito, tiempo y ayuda | Pendiente |
| ML real | Dataset autorizado, hash, corte temporal, métricas y límites | Sin datos elegibles |

Los cambios de código y pruebas generadas son evidencia técnica auténtica; no
equivalen a actas Scrum. No reconstruir retrospectivamente reuniones inexistentes.

## Formularios de registro

Sprint: ID / fechas / objetivo / asistentes reales / historias demostradas /
evidencias / aceptado o rechazado con motivo / siguiente acción y responsable.

Piloto: ID seudónimo / autorización / fecha-turno / rol / dispositivo-navegador /
red / tarea / inicio-fin / éxito / ayuda / incidencia / consentimiento aplicable.

Medición: llegada, inicio de selección, envío, confirmed_at, preparing_at, ready_at
y entrega son hitos diferentes. Comparar grupos y turnos equivalentes, declarar
faltantes y exclusiones antes del análisis. El cuestionario de seis ítems es propio,
no SUS. Reportar distribución por ítem; no inventar un índice SUS.
