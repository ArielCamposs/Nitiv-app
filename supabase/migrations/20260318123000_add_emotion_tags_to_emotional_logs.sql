alter table public.emotional_logs
add column if not exists emotion_tags text[] not null default '{}'::text[];

