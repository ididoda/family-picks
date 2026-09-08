-- Players
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into players (name) values
  ('Ryan'), ('Nicole'), ('Mike'), ('Mom'), ('Dad'),
  ('Annie'), ('Nathan'), ('Aidan'), ('Kate');

-- Seasons
create table seasons (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique,
  is_active boolean not null default false
);

insert into seasons (year, is_active) values (2026, true);

-- Weeks
create table weeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id),
  week_number integer not null,
  status text not null default 'open', -- open | complete
  unique (season_id, week_number)
);

-- Games
create table games (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id),
  away_team text not null,
  home_team text not null,
  kickoff_time timestamptz not null,
  status text not null default 'scheduled', -- scheduled | in_progress | final
  away_score integer,
  home_score integer,
  winning_team text -- null until final
);

-- Picks
create table picks (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  game_id uuid not null references games(id),
  picked_team text not null,
  submitted_at timestamptz not null default now(),
  unique (player_id, game_id)
);

-- Indexes
create index on games(week_id);
create index on picks(player_id);
create index on picks(game_id);

-- RLS
alter table players enable row level security;
alter table seasons enable row level security;
alter table weeks enable row level security;
alter table games enable row level security;
alter table picks enable row level security;

create policy "public read" on players for select using (true);
create policy "public read" on seasons for select using (true);
create policy "public read" on weeks for select using (true);
create policy "public read" on games for select using (true);
create policy "public read" on picks for select using (true);
create policy "public insert" on picks for insert with check (true);
-- players may change a pick before kickoff; the upsert in PickPanel needs UPDATE
create policy "public update" on picks for update using (true) with check (true);
