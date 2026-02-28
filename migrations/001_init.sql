-- ============================================================
-- 1.  next_auth schema  (@auth/supabase-adapter tables)
-- ============================================================

create schema if not exists next_auth;

grant usage                         on schema next_auth to service_role;
grant all on all tables     in schema next_auth to service_role;
grant all on all sequences  in schema next_auth to service_role;
grant all on all routines   in schema next_auth to service_role;

-- uid() helper used by the adapter
create or replace function next_auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- users
create table if not exists next_auth.users (
  id              uuid        not null default gen_random_uuid(),
  name            text,
  email           text        unique,
  "emailVerified" timestamptz,
  image           text,
  primary key (id)
);
grant all on next_auth.users to service_role;

-- accounts  (camelCase cols required by the adapter)
create table if not exists next_auth.accounts (
  id                   uuid   not null default gen_random_uuid(),
  type                 text,
  provider             text,
  "providerAccountId"  text,
  refresh_token        text,
  access_token         text,
  expires_at           bigint,
  token_type           text,
  scope                text,
  id_token             text,
  session_state        text,
  oauth_token_secret   text,
  oauth_token          text,
  "userId"             uuid   references next_auth.users(id) on delete cascade,
  primary key (id)
);
grant all on next_auth.accounts to service_role;

-- sessions
create table if not exists next_auth.sessions (
  id              uuid        not null default gen_random_uuid(),
  expires         timestamptz not null,
  "sessionToken"  text        not null unique,
  "userId"        uuid        references next_auth.users(id) on delete cascade,
  primary key (id)
);
grant all on next_auth.sessions to service_role;

-- verification_tokens
create table if not exists next_auth.verification_tokens (
  id         bigserial   primary key,
  identifier text,
  token      text,
  expires    timestamptz
);
grant all on next_auth.verification_tokens to service_role;


-- ============================================================
-- 2.  public.deployments
--     user_id references next_auth.users (not public.users)
-- ============================================================

create table if not exists public.deployments (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references next_auth.users(id) on delete cascade,
  agent_type          text        not null check (agent_type in ('assistant', 'dev', 'content', 'sales')),
  channel             text        not null default 'slack',
  status              text        not null default 'active' check (status in ('active', 'inactive', 'error')),
  slack_team_id       text,
  slack_team_name     text,
  slack_bot_user_id   text,
  slack_access_token  text,
  slack_channel_id    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Enable RLS; service_role bypasses it automatically
alter table public.deployments enable row level security;
