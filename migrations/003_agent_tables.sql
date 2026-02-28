-- Agent memories: key/value store scoped to each deployment
CREATE TABLE public.agent_memories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  key           text NOT NULL,
  value         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_memories_deployment_key_unique UNIQUE (deployment_id, key)
);
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- Agent tasks: todo list scoped to each deployment
CREATE TABLE public.agent_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  title         text NOT NULL,
  due_date      date,
  completed     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

-- Agent messages: conversation history keyed by (deployment, channel, thread)
-- content is jsonb — Claude ContentBlock arrays round-trip without extra serialisation
CREATE TABLE public.agent_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid NOT NULL REFERENCES public.deployments(id) ON DELETE CASCADE,
  channel_id    text NOT NULL,
  thread_ts     text NOT NULL,
  role          text NOT NULL CHECK (role IN ('user', 'assistant')),
  content       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_messages_thread_idx
  ON public.agent_messages (deployment_id, channel_id, thread_ts, created_at);
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
