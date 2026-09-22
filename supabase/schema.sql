-- Inventory Rescue AI - database schema
-- Run this in the Supabase dashboard: SQL Editor -> New query -> Run
-- When it asks about Row Level Security, choose "Run and enable RLS".

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

create table businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  city          text not null,
  contact_email text not null,
  created_at    timestamptz default now()
);

create table buyer_needs (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  product_type      text not null,
  quantity_required integer not null,
  max_price         numeric not null,
  is_active         boolean default true
);

-- product_type is what every search filters on, so index it
create index on buyer_needs (product_type);

-- ---------------------------------------------------------------
-- Sample buyers, so there is something to match against
-- ---------------------------------------------------------------

insert into businesses (id, name, city, contact_email) values
  ('11111111-1111-1111-1111-111111111111', 'Sharma Wholesale', 'Ludhiana', 'sharma@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Gupta Traders',    'Amritsar', 'gupta@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'Singh Kirana',     'Ludhiana', 'singh@example.com');

insert into buyer_needs (business_id, product_type, quantity_required, max_price) values
  ('11111111-1111-1111-1111-111111111111', 'rice',  300, 45),
  ('22222222-2222-2222-2222-222222222222', 'rice',  800, 38),
  ('33333333-3333-3333-3333-333333333333', 'sugar', 200, 50);

-- ---------------------------------------------------------------
-- Note on Row Level Security
-- ---------------------------------------------------------------
-- With RLS enabled and no policies, nobody can read these tables using the
-- anon key - which is exactly what we want. The find-buyers Edge Function
-- uses the service_role key, which bypasses RLS and runs only on the server.
