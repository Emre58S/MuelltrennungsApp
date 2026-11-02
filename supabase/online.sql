-- Datei: supabase/online.sql
-- Zufallsgegner für Zeit-Sprint und Survival (Online-Bereich, ROADMAP R4d):
-- Jeder fertige Lauf geht als kurzer Code an den Server (game/sprint.ts
-- encodeSprint: Tonne + Zeitabstand je Wurf). Beim Start holt das Spiel den
-- Lauf eines anderen Spielers von heute mit ähnlich vielen Treffern – der
-- fliegt dann als Ghost mit. Richtig/falsch rechnet das Spiel aus der
-- Tages-Strecke selbst nach. Aus denselben Läufen entstehen die Ranglisten
-- je Modus (diese Woche / Allzeit, ROADMAP R4f).
-- Einmal im Supabase-Projekt ausführen: Dashboard → SQL Editor → einfügen → Run.
-- Erneut ausführen ist unschädlich (neue Funktionen kommen dazu, Läufe bleiben).
-- Setzt supabase/rangliste.sql voraus (Tabelle players, Funktion set_name).
--
-- Datenschutz wie bei der Rangliste: Die Geräte-ID verlässt die Datenbank nie,
-- Abfragen liefern nur Spitzname und Lauf.

create table if not exists public.online_runs (
  mode text not null check (mode in ('sprint', 'survival')),
  day text not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  player uuid not null references public.players (id) on delete cascade,
  code text not null check (code ~ '^([0-9][0-9a-z]{2}){1,100}$'),
  correct integer not null check (correct between 1 and 100),
  ms integer not null check (ms between 1 and 70000),
  created_at timestamptz not null default now(),
  primary key (mode, day, player)
);

create index if not exists online_runs_pick on public.online_runs (mode, day, correct);

alter table public.online_runs enable row level security;
revoke all on public.online_runs from anon, authenticated;

-- Lauf einreichen: je Spieler, Modus und Tag bleibt nur der beste (mehr richtig)
create or replace function public.submit_online_run(
  p_player uuid, p_mode text, p_day text, p_code text, p_correct integer, p_ms integer
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
  if p_mode not in ('sprint', 'survival') then
    raise exception 'falscher Modus';
  end if;
  -- Je Wurf 3 Zeichen; mehr Treffer als Würfe geht nicht
  if length(p_code) % 3 <> 0 or p_correct > length(p_code) / 3 then
    raise exception 'ungültiger Lauf';
  end if;
  -- nur heute (±1 Tag wegen Zeitzonen)
  if p_day !~ '^\d{4}-\d{2}-\d{2}$' or p_day::date not between current_date - 1 and current_date + 1 then
    raise exception 'falscher Tag';
  end if;
  insert into online_runs (mode, day, player, code, correct, ms)
  values (p_mode, p_day, p_player, lower(p_code), p_correct, p_ms)
  on conflict (mode, day, player) do update
    set code = excluded.code, correct = excluded.correct, ms = excluded.ms, created_at = now()
    where excluded.correct > online_runs.correct;
end;
$$;

-- Zufallsgegner: ein anderer Spieler von heute mit möglichst ähnlich vielen
-- Treffern (unter den 5 nächsten zufällig, damit nicht immer derselbe kommt)
create or replace function public.random_online_run(p_mode text, p_day text, p_player uuid, p_correct integer)
returns table (name text, code text, correct integer, ms integer)
language sql
volatile
security definer
set search_path = public
as $$
  select name, code, correct, ms from (
    select p.name, r.code, r.correct, r.ms
    from online_runs r
    join players p on p.id = r.player
    where r.mode = p_mode and r.day = p_day and r.player <> p_player
    order by abs(r.correct - p_correct), r.created_at desc
    limit 5
  ) near
  order by random()
  limit 1;
$$;

-- Rangliste je Modus (ROADMAP R4f): bester Lauf je Spieler ab p_since
-- (JJJJ-MM-TT, Montag der Woche; null = Allzeit). Gewertet wird „richtig“ –
-- wie im Rennen selbst; gleich viele = gleicher Platz.
create or replace function public.online_top(p_mode text, p_since text, p_player uuid, p_limit integer default 50)
returns table (rank bigint, name text, score integer, is_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select r.player, max(r.correct) as score
    from online_runs r
    where r.mode = p_mode and r.day >= coalesce(p_since, '0000-00-00')
    group by r.player
  )
  select rank() over (order by b.score desc), p.name, b.score, b.player = p_player
  from best b
  join players p on p.id = b.player
  order by b.score desc, p.name
  limit greatest(1, least(p_limit, 100));
$$;

-- Eigener Platz (auch wenn man nicht unter den Besten steht)
create or replace function public.online_my_rank(p_mode text, p_since text, p_player uuid)
returns table (rank bigint, score integer)
language sql
stable
security definer
set search_path = public
as $$
  with best as (
    select r.player, max(r.correct) as score
    from online_runs r
    where r.mode = p_mode and r.day >= coalesce(p_since, '0000-00-00')
    group by r.player
  ),
  ranked as (
    select player, score, rank() over (order by score desc) as rank from best
  )
  select rank, score from ranked where player = p_player;
$$;

grant execute on function public.submit_online_run(uuid, text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.random_online_run(text, text, uuid, integer) to anon, authenticated;
grant execute on function public.online_top(text, text, uuid, integer) to anon, authenticated;
grant execute on function public.online_my_rank(text, text, uuid) to anon, authenticated;
