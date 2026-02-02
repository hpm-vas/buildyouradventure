-- Migration: Create users table and auth_with_pin function
-- Run this in Supabase SQL Editor

-- Users table for PIN-based authentication
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  pin varchar(6) unique not null,
  role varchar(10) not null check (role in ('player', 'reader', 'admin')),
  name varchar(100),
  created_at timestamptz default now(),
  last_active timestamptz default now()
);

-- Index for fast PIN lookups
create index if not exists idx_users_pin on users(pin);

-- RPC function to validate PIN and return user data
create or replace function auth_with_pin(p_pin varchar(6))
returns json
language plpgsql
security definer
as $$
declare
  v_user record;
begin
  -- Validate PIN format
  if p_pin is null or length(p_pin) != 6 or p_pin !~ '^\d{6}$' then
    return json_build_object(
      'success', false,
      'error', 'invalid_pin_format'
    );
  end if;

  -- Find user by PIN
  select id, role, name
  into v_user
  from users
  where pin = p_pin;

  if not found then
    return json_build_object(
      'success', false,
      'error', 'invalid_pin'
    );
  end if;

  -- Update last_active timestamp
  update users set last_active = now() where id = v_user.id;

  -- Return user data
  return json_build_object(
    'success', true,
    'user', json_build_object(
      'id', v_user.id,
      'role', v_user.role,
      'name', v_user.name
    )
  );
end;
$$;

-- Seed test users (remove in production)
insert into users (pin, role, name) values
  ('000000', 'admin', 'Game Master'),
  ('123456', 'player', 'Test Player'),
  ('111111', 'reader', 'Test Reader')
on conflict (pin) do nothing;
