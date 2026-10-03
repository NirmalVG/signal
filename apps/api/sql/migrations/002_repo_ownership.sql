-- 002_repo_ownership.sql
-- Run ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again; every statement is idempotent.
--
-- What it does:
--   1. Gives every repo an owner (user_id) and marks the shared demo (is_demo).
--   2. Locks the tables against Supabase's public REST endpoint. The API uses
--      the service_role key, which bypasses all of this, so the app is
--      unaffected; only direct calls made with the browser-visible
--      publishable/anon key are shut out.

begin;

-- 1. Ownership ---------------------------------------------------------------
alter table repos
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists is_demo boolean not null default false;

create index if not exists repos_user_id_idx on repos (user_id);

-- A repo is EITHER someone's OR the shared demo, never both...
alter table repos drop constraint if exists repos_owner_xor_demo;
alter table repos add constraint repos_owner_xor_demo
  check (not (is_demo and user_id is not null));

-- ...and there is at most one demo.
create unique index if not exists repos_single_demo_idx on repos (is_demo) where is_demo;

-- 2. Close the public REST door --------------------------------------------------
alter table repos   enable row level security;
alter table chunks  enable row level security;
alter table queries enable row level security;

-- No policies are created on purpose: with RLS on and no policy, the
-- anon and authenticated roles can read and write nothing.
-- Belt and braces: also remove their table privileges, so the tables stay
-- closed even if someone later disables RLS by mistake.
revoke all on table repos, chunks, queries from anon, authenticated;

-- The search function would otherwise be callable by anyone via /rest/v1/rpc.
revoke execute on function match_chunks(vector, uuid, int) from public, anon, authenticated;
grant  execute on function match_chunks(vector, uuid, int) to service_role;

commit;
