alter table restaurant_users add column if not exists session_version integer not null default 1;
alter table orders add column if not exists request_hash text;
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists preparing_at timestamptz;

create or replace function invalidate_staff_sessions() returns trigger language plpgsql as $$
begin
  if new.password_hash is distinct from old.password_hash
     or new.role is distinct from old.role or new.active is distinct from old.active then
    new.session_version := old.session_version + 1;
  end if;
  return new;
end $$;
create trigger staff_session_invalidation before update on restaurant_users
for each row execute function invalidate_staff_sessions();

create table auth_attempts (
  username text primary key,
  attempts integer not null default 0,
  window_started timestamptz not null default now()
);
