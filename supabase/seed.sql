-- Insert Week 1
insert into weeks (season_id, week_number, status)
select id, 1, 'open' from seasons where year = 2026;

-- Insert sample games for Week 1
insert into games (week_id, away_team, home_team, kickoff_time)
select
  w.id,
  g.away_team,
  g.home_team,
  g.kickoff_time
from weeks w,
(values
  ('KC',  'LAR', '2026-09-10 20:20:00+00'::timestamptz),
  ('BUF', 'MIA', '2026-09-13 17:00:00+00'::timestamptz),
  ('DAL', 'PHI', '2026-09-13 17:00:00+00'::timestamptz),
  ('NYG', 'MIN', '2026-09-13 17:00:00+00'::timestamptz),
  ('ATL', 'NO',  '2026-09-13 17:00:00+00'::timestamptz),
  ('CLE', 'PIT', '2026-09-13 17:00:00+00'::timestamptz),
  ('TEN', 'IND', '2026-09-13 17:00:00+00'::timestamptz),
  ('HOU', 'JAC', '2026-09-13 17:00:00+00'::timestamptz),
  ('DEN', 'LV',  '2026-09-13 17:00:00+00'::timestamptz),
  ('GB',  'CHI', '2026-09-13 20:25:00+00'::timestamptz),
  ('SF',  'SEA', '2026-09-13 20:25:00+00'::timestamptz),
  ('ARI', 'LAC', '2026-09-13 20:25:00+00'::timestamptz),
  ('DET', 'TB',  '2026-09-13 20:25:00+00'::timestamptz),
  ('BAL', 'NE',  '2026-09-13 20:25:00+00'::timestamptz),
  ('CIN', 'WAS', '2026-09-14 00:20:00+00'::timestamptz),
  ('NYJ', 'CAR', '2026-09-15 00:15:00+00'::timestamptz)
) as g(away_team, home_team, kickoff_time)
where w.week_number = 1
and w.season_id = (select id from seasons where year = 2026);
