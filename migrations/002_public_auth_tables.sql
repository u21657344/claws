-- ============================================================
-- Replace next_auth schema approach with public schema tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Auth users
CREATE TABLE IF NOT EXISTS public.auth_users (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text,
  email          text        UNIQUE,
  email_verified timestamptz,
  image          text
);

-- Auth accounts (OAuth provider links)
CREATE TABLE IF NOT EXISTS public.auth_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  type                text,
  provider            text,
  provider_account_id text,
  refresh_token       text,
  access_token        text,
  expires_at          bigint,
  token_type          text,
  scope               text,
  id_token            text,
  session_state       text
);

-- Auth sessions
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  session_token text        NOT NULL UNIQUE,
  expires       timestamptz NOT NULL
);

-- Drop and recreate deployments to reference public.auth_users
DROP TABLE IF EXISTS public.deployments;

CREATE TABLE public.deployments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES public.auth_users(id) ON DELETE CASCADE,
  agent_type          text        NOT NULL CHECK (agent_type IN ('assistant', 'dev', 'content', 'sales')),
  channel             text        NOT NULL DEFAULT 'slack',
  status              text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  slack_team_id       text,
  slack_team_name     text,
  slack_bot_user_id   text,
  slack_access_token  text,
  slack_channel_id    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
