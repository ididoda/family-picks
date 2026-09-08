-- Light PIN auth for players.
-- The hash lives server-side only; the anon/public API can never read it.
-- Run this once against the live database (Supabase SQL editor).

alter table players add column if not exists pin_hash text;
alter table players add column if not exists pin_set_at timestamptz;
alter table players add column if not exists pin_attempts integer not null default 0;
alter table players add column if not exists locked_until timestamptz;

-- Rows stay publicly readable, but only the safe columns. A column-level REVOKE
-- is a no-op while the role holds table-level SELECT, so drop that and re-grant
-- explicitly. Service-role (used by the API routes) bypasses this.
revoke select on players from anon, authenticated;
grant select (id, name, is_active, created_at) on players to anon, authenticated;

notify pgrst, 'reload schema';
