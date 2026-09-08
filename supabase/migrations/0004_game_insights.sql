-- Per-game insight blob (odds, records, form, head-to-head), refreshed weekly
-- by the commissioner. Run once against the live database.

create table if not exists game_insights (
  game_id uuid primary key references games(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table game_insights enable row level security;
create policy "public read" on game_insights for select using (true);
-- writes are service-role only (refresh-insights route)

notify pgrst, 'reload schema';
