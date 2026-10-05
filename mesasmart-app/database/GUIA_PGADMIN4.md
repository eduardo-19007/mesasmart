# Guía paso a paso: base de datos MesaSmart en pgAdmin 4

Esta guía crea una base local para MesaSmart mediante pgAdmin 4 y ejecuta las migraciones incluidas en el proyecto.

## 1. Comprobar PostgreSQL y pgAdmin

1. Abra **pgAdmin 4**.
2. En el panel izquierdo expanda **Servers**.
3. Si ya aparece un servidor PostgreSQL, selecciónelo e ingrese su contraseña.
4. Si no aparece, use **Register > Server**:
   - **General > Name:** `PostgreSQL local`.
   - **Connection > Host name/address:** `localhost`.
   - **Port:** `5432`.
   - **Maintenance database:** `postgres`.
   - **Username:** `postgres`.
   - Ingrese la contraseña definida al instalar PostgreSQL y pulse **Save**.

## 2. Crear el usuario de la aplicación

1. Expanda el servidor y seleccione la base `postgres`.
2. Abra **Tools > Query Tool**.
3. Ejecute el siguiente bloque, reemplazando la contraseña de ejemplo:

```sql
create role mesasmart_app
  with login
  password 'MesaSmart_Local_2026'
  nosuperuser
  nocreatedb
  nocreaterole;
```

Si el rol ya existe, no vuelva a crearlo. Puede cambiar su contraseña con:

```sql
alter role mesasmart_app password 'MesaSmart_Local_2026';
```

La contraseña anterior es únicamente un ejemplo local. No debe utilizarse en producción.

## 3. Crear la base desde la interfaz

1. Haga clic derecho en **Databases**.
2. Seleccione **Create > Database**.
3. En **Database** escriba `mesasmart`.
4. En **Owner** seleccione `mesasmart_app`.
5. Mantenga `UTF8` como codificación.
6. Pulse **Save**.
7. Actualice el árbol con **Refresh** y confirme que aparece `mesasmart`.

PostgreSQL exige que quien crea una base sea superusuario o tenga el privilegio `CREATEDB`. Al crearla desde la sesión administrativa y asignar `mesasmart_app` como propietario, la aplicación obtiene control sobre sus propios objetos sin convertirse en superusuario.

## 4. Configurar MesaSmart

En la raíz de `mesasmart-app`, cree `.env.local` a partir de `.env.example` y use:

```dotenv
DATABASE_URL=postgresql://mesasmart_app:MesaSmart_Local_2026@localhost:5432/mesasmart
DEMO_MODE=false
QR_SIGNING_SECRET=GENERE_UN_SECRETO_ALEATORIO_DISTINTO_DE_AL_MENOS_32_CARACTERES
AUTH_SESSION_SECRET=GENERE_OTRO_SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES
RESTAURANT_SLUG=miraflores
APP_URL=http://localhost:3000
```

Genere cada secreto por separado con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`; no conserve los marcadores del ejemplo.

Si la contraseña contiene `@`, `:`, `/`, `#`, `%` u otros caracteres reservados, debe codificarlos para una URL. Para la primera prueba local puede utilizar una contraseña alfanumérica larga.

## 5. Ejecutar las migraciones

Abra PowerShell en la carpeta `mesasmart-app` y ejecute:

```powershell
npm run db:migrate
```

Si PowerShell indica que `pnpm` no se reconoce, utilice directamente Node.js:

```powershell
node scripts/migrate.mjs
```

El migrador carga automáticamente las variables guardadas en `.env.local`.

Puede verificar la conexión y los datos iniciales sin abrir pgAdmin mediante:

```powershell
node scripts/check-database.mjs
```

El resultado esperado es:

```text
Aplicada: database/schema.sql
Aplicada: database/002_operational_fields_and_seed.sql
Aplicada: database/003_staff_authentication.sql
Aplicada: database/004_staff_audit.sql
Aplicada: database/005_product_audit.sql
Aplicada: database/006_review_integrity.sql
Aplicada: database/007_table_audit.sql
```

Si vuelve a ejecutar el comando, las siete migraciones deben aparecer como `Omitida`. Esto confirma que el proceso es repetible.

## 6. Verificar la estructura en pgAdmin

1. En pgAdmin, haga clic derecho sobre `mesasmart` y seleccione **Refresh**.
2. Expanda **Schemas > public > Tables**.
3. Deben aparecer estas tablas:
   - `restaurants`
   - `restaurant_users`
   - `dining_tables`
   - `products`
   - `table_sessions`
   - `orders`
   - `order_items`
   - `order_events`
   - `schema_migrations`
   - `staff_audit_events`
   - `product_audit_events`
   - `auth_attempts`
   - `table_audit_events`
4. Abra **Tools > Query Tool** sobre la base `mesasmart`.
5. Abra y ejecute `database/verificar_instalacion.sql`.

La verificación debe informar un restaurante, 12 mesas, ocho productos y siete migraciones aplicadas en una instalacion inicial; los conteos de datos cambian con el uso.

La estructura incluye 13 tablas. No elimine tablas ni registros para igualar los conteos de una instalacion inicial.

## 7. Crear el primer usuario administrativo

En PowerShell, asigne temporalmente una contraseña de 12 caracteres o más y ejecute:

```powershell
$env:STAFF_PASSWORD="SuNuevaClaveSegura2026!"
node scripts/create-staff.mjs admin ADMIN
Remove-Item Env:STAFF_PASSWORD
```

El mismo comando permite crear personal de cocina o atención cambiando el nombre y el rol por `KITCHEN` o `WAITER`. Si el usuario ya existe, actualiza su contraseña y rol.

## 8. Iniciar y probar el sistema

Detenga cualquier servidor de desarrollo anterior y vuelva a iniciarlo para que Next.js lea `.env.local`:

```powershell
npm run dev
```

Pruebe en este orden:

1. Abra `http://localhost:3000/admin/mesas`.
2. Genere un QR para la mesa 01.
3. Abra el enlace generado y registre un pedido.
4. Abra `http://localhost:3000/cocina` y confirme que aparece el pedido.
5. Cámbielo a **En preparación** y luego a **Listo**.
6. Abra `http://localhost:3000/atencion`, marque la entrega y cierre el pedido. Luego revise los indicadores en `/admin`.
7. En pgAdmin consulte `orders`, `order_items` y `order_events` para confirmar la persistencia.

## 9. Consultas de inspección útiles

```sql
select public_code, status, subtotal_cents, estimated_minutes, created_at
from orders
order by created_at desc;

select o.public_code, e.from_status, e.to_status, e.occurred_at, e.metadata
from order_events e
join orders o on o.id = e.order_id
order by e.occurred_at desc;
```

## 10. Problemas frecuentes

- **`password authentication failed`:** revise usuario y contraseña en `DATABASE_URL`.
- **`database "mesasmart" does not exist`:** verifique el nombre de la base y el puerto.
- **`ECONNREFUSED`:** confirme que el servicio PostgreSQL esté iniciado y escuche en el puerto 5432.
- **`permission denied`:** confirme que `mesasmart_app` sea propietario de la base.
- **La aplicación conserva datos de prueba:** revise que `DEMO_MODE=false` y reinicie `npm run dev`.
- **El QR deja de funcionar después de reiniciar con otra clave:** conserve el mismo `QR_SIGNING_SECRET`; cambiarlo invalida los códigos anteriores.

## 11. Respaldo inicial

Cuando haya verificado el sistema, haga clic derecho en la base `mesasmart`, seleccione **Backup**, elija formato **Custom** y guarde un archivo `.backup`. Este respaldo puede restaurarse posteriormente mediante la opción **Restore** de pgAdmin.
