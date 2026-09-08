-- Commissioner access is tied to a player, not a separate PIN.
-- Run once against the live database.

alter table players add column if not exists is_commissioner boolean not null default false;

update players set is_commissioner = true where name = 'Ryan';

-- expose the flag to the public API (table SELECT was revoked; columns are granted explicitly)
grant select (is_commissioner) on players to anon, authenticated;

notify pgrst, 'reload schema';
