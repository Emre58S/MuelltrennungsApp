-- Datei: supabase/ghost.sql
-- Ghost des Tagesbesten (Ghost-Rennen): Der beste Lauf des Tages fliegt bei
-- allen als Ghost mit. Gespeichert wird nur der Lauf-Code (siehe
-- game/ghost.ts encodeRun: Tonne + Zeit je Wurf), Treffer und Zeit.
-- Einmal im Supabase-Projekt ausführen: Dashboard → SQL Editor → einfügen → Run.
-- Setzt supabase/rangliste.sql voraus (Tabelle players, Funktion set_name).
--
-- Datenschutz wie bei der Rangliste: Die Geräte-ID verlässt die Datenbank nie,
-- Abfragen liefern nur Spitzname, Lauf und „das bist du“ (is_me).

create table if not exists public.ghost_runs (
  day text not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  player uuid not null references public.players (id) on delete cascade,
  code text not null check (code ~ '^gh[0-9a-z]{9,40}$'),
  correct integer not null check (correct between 0 and 10),
  ms integer not null check (ms between 1 and 600000),
  created_at timestamptz not null default now(),
  primary key (day, player)
);

create index if not exists ghost_runs_best on public.ghost_runs (day, correct desc, ms asc);

alter table public.ghost_runs enable row level security;
revoke all on public.ghost_runs from anon, authenticated;

-- Lauf einreichen: je Spieler und Tag bleibt nur der beste (mehr richtig, dann schneller)
create or replace function public.submit_ghost(
  p_player uuid, p_day text, p_code text, p_correct integer, p_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from players where id = p_player) then
    raise exception 'unbekannter Spieler';
  end if;
  insert into ghost_runs (day, player, code, correct, ms)
  values (p_day, p_player, lower(p_code), p_correct, p_ms)
  on conflict (day, player) do update
    set code = excluded.code, correct = excluded.correct, ms = excluded.ms, created_at = now()
    where excluded.correct > ghost_runs.correct
       or (excluded.correct = ghost_runs.correct and excluded.ms < ghost_runs.ms);
end;
$$;

-- Bester Lauf des Tages (bei Gleichstand der frühere)
create or replace function public.top_ghost(p_day text, p_player uuid)
returns table (name text, code text, correct integer, ms integer, is_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.name, g.code, g.correct, g.ms, g.player = p_player
  from ghost_runs g
  join players p on p.id = g.player
  where g.day = p_day
  order by g.correct desc, g.ms asc, g.created_at asc
  limit 1;
$$;

grant execute on function public.submit_ghost(uuid, text, text, integer, integer) to anon, authenticated;
grant execute on function public.top_ghost(text, uuid) to anon, authenticated;
