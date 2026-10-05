create table if not exists staff_audit_events (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  actor_user_id uuid references restaurant_users(id),
  target_user_id uuid references restaurant_users(id),
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists staff_audit_events_restaurant_time_idx on staff_audit_events (restaurant_id, occurred_at desc);
