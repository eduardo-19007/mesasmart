select current_database() as base_actual, current_user as usuario_actual, version() as version_postgresql;

select
  (select count(*) from restaurants) as restaurantes,
  (select count(*) from dining_tables) as mesas,
  (select count(*) from products) as productos,
  (select count(*) from schema_migrations) as migraciones;

select code, capacity, active
from dining_tables
order by code;

select slug, name, category, price_cents, available
from products
order by category, name;

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
