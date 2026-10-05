create sequence if not exists order_public_code_seq start with 1043;

alter table products add column if not exists slug text;
alter table orders add column if not exists public_code text;
update products set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) where slug is null;
update orders set public_code = 'MS-' || nextval('order_public_code_seq') where public_code is null;
alter table products alter column slug set not null;
alter table orders alter column public_code set not null;
alter table orders alter column public_code set default ('MS-' || nextval('order_public_code_seq'));
create unique index if not exists products_restaurant_slug_idx on products (restaurant_id, slug);
create unique index if not exists orders_public_code_idx on orders (public_code);

insert into restaurants (name, slug) values ('MesaSmart Miraflores', 'miraflores') on conflict (slug) do nothing;

insert into dining_tables (restaurant_id, code, capacity, qr_token_hash)
select r.id, 'M' || lpad(series::text, 2, '0'), 4, encode(gen_random_bytes(24), 'hex')
from restaurants r cross join generate_series(1, 12) series where r.slug = 'miraflores'
on conflict (restaurant_id, code) do nothing;

insert into products (restaurant_id, slug, name, description, category, price_cents, base_minutes, available, image_url)
select r.id, values.slug, values.name, values.description, values.category, values.price, values.minutes, true, values.image
from restaurants r cross join (values
  ('anticuchos','Anticuchos de corazón','Papas doradas, choclo y salsa de ají amarillo.','Entradas',2600,15,'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba'),
  ('causa','Causa limeña','Papa amarilla, pollo, palta y huevo de corral.','Entradas',2200,12,'https://images.unsplash.com/photo-1547592180-85f173990554'),
  ('lomo','Lomo saltado','Lomo fino, cebolla, tomate, papas y arroz.','Fondos',4200,24,'https://images.unsplash.com/photo-1544025162-d76694265947'),
  ('pasta','Pasta al pesto','Fettuccine, pesto de albahaca, queso y tomate confitado.','Fondos',3400,20,'https://images.unsplash.com/photo-1473093295043-cdd812d0e601'),
  ('burger','Hamburguesa criolla','Carne, queso, cebolla caramelizada y papas nativas.','Fondos',3600,18,'https://images.unsplash.com/photo-1568901346375-23c9450c58cd'),
  ('chicha','Chicha morada','Maíz morado, piña, canela y limón.','Bebidas',1000,3,'https://images.unsplash.com/photo-1544145945-f90425340c7e'),
  ('limonada','Limonada de hierbaluisa','Limón fresco y hierbaluisa de la casa.','Bebidas',1200,4,'https://images.unsplash.com/photo-1523371054106-bbf80586c38c'),
  ('suspiro','Suspiro limeño','Manjar de yemas y merengue al oporto.','Postres',1800,8,'https://images.unsplash.com/photo-1551024601-bec78aea704b')
) as values(slug,name,description,category,price,minutes,image)
where r.slug = 'miraflores'
on conflict (restaurant_id, slug) do update set name = excluded.name, description = excluded.description, category = excluded.category, price_cents = excluded.price_cents, base_minutes = excluded.base_minutes, image_url = excluded.image_url;
