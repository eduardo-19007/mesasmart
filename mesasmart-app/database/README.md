# Base de datos de MesaSmart

Consulte [GUIA_PGADMIN4.md](GUIA_PGADMIN4.md) para la instalacion paso a paso.

1. Crear la base PostgreSQL y su usuario propietario.
2. Configurar .env.local: DATABASE_URL, DEMO_MODE=false, RESTAURANT_SLUG, APP_URL y dos secretos diferentes de al menos 32 caracteres.
3. Ejecutar `node scripts/migrate.mjs` o `npm run db:migrate`.
4. Crear el personal con `node scripts/create-staff.mjs` siguiendo la guia.
5. Iniciar con `npm run dev`.

El migrador registra siete archivos en schema_migrations y no repite los aplicados.
La instalacion inicial incluye un restaurante, 12 mesas y ocho productos. Los datos posteriores dependen del uso.
La sexta migracion incorpora revocacion de sesiones, huella de pedidos, marcas temporales y limitacion de intentos de acceso. La septima agrega auditoria de mesas.

No se incluyen secretos reales en el repositorio. DEMO_MODE=true no es una alternativa completa a PostgreSQL para los modulos administrativos.
