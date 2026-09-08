-- Append-only audit log of every pick change. Fail-safe historical record:
-- survives app bugs and bad edits. Written by a trigger, never touched by the
-- app. Readable only via the service role (the export route). Run once.

create table if not exists pick_audit (
  id bigint generated always as identity primary key,
  action text not null, -- INSERT | UPDATE | DELETE
  player_id uuid,
  game_id uuid,
  picked_team text,
  changed_at timestamptz not null default now()
);

alter table pick_audit enable row level security;
-- no policies: anon/authenticated cannot read; service_role bypasses RLS

create or replace function log_pick_change() returns trigger
language plpgsql security definer as $$
begin
  if (tg_op = 'DELETE') then
    insert into pick_audit (action, player_id, game_id, picked_team)
    values ('DELETE', old.player_id, old.game_id, old.picked_team);
    return old;
  else
    insert into pick_audit (action, player_id, game_id, picked_team)
    values (tg_op, new.player_id, new.game_id, new.picked_team);
    return new;
  end if;
end $$;

drop trigger if exists picks_audit on picks;
create trigger picks_audit
  after insert or update or delete on picks
  for each row execute function log_pick_change();

notify pgrst, 'reload schema';
