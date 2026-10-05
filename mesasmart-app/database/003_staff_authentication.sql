alter table restaurant_users add column if not exists username text;
alter table restaurant_users add column if not exists password_hash text;
alter table restaurant_users add column if not exists last_login_at timestamptz;
create unique index if not exists restaurant_users_username_idx on restaurant_users (lower(username)) where username is not null;
