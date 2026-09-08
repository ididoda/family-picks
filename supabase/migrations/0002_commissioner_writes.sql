-- The commissioner UI writes game results and week status straight from the
-- client (it's PIN-gated in the app, same trust model as picks). RLS only had
-- read policies for these tables, so those writes were silently failing.
-- Run once against the live database.

create policy "public update" on games for update using (true) with check (true);
create policy "public insert" on weeks for insert with check (true);
create policy "public update" on weeks for update using (true) with check (true);
