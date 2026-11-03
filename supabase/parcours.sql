-- Datei: supabase/parcours.sql
-- Trick-Battle (ROADMAP R4c): Parcours-Läufe online. Jeder fertige Parcours-Lauf
-- geht als kurzer Code an den Server (game/parcours.ts encodeParcours: je
-- Treffer Punkte + Zeitabstand). Daraus kommen später Gegner-Ghosts und die
-- Rangliste „Parcours des Tages“. Die Hindernisse hängen nur an der Rundenzeit –
-- ein Ghost sieht also exakt denselben Parcours.
-- Einmal im Supabase-Projekt ausführen: Dashboard → SQL Editor → einfügen → Run.
-- Erneut ausführen ist unschädlich (Funktionen werden ersetzt, Läufe bleiben).
-- Setzt supabase/rangliste.sql voraus (Tabelle players, Funktion set_name) und
-- supabase/freunde.sql (Freund herausfordern: friend_parcours_run).
--
-- Datenschutz wie bei der Rangliste: Die Geräte-ID verlässt die Datenbank nie,
-- Abfragen liefern nur Spitzname und Lauf.

create table if not exists public.parcours_runs (
  level integer not null check (level between 1 and 20),
  day text not null check (day ~ '^\d{4}-\d{2}-\d{2}$'),
  player uuid not null references public.players (id) on delete cascade,
  code text not null check (code ~ '^([1-4][0-9a-z]{2}){1,100}$'),
  points integer not null check (points between 1 and 400),
  created_at timestamptz not null default now(),
  primary key (level, day, player)
);

create index if not exists parcours_runs_pick on public.parcours_runs (level, day, points);

alter table public.parcours_runs enable row level security;
revoke all on public.parcours_runs from anon, authenticated;

-- Lauf einreichen: je Spieler, Parcours und Tag bleibt nur der beste (mehr Punkte)
create or replace function public.submit_parcours_run(
  p_player uuid, p_level integer, p_day text, p_code text, p_points integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sum integer;
  v_ds integer;
begin
  if not exists (select 1 from players where id = p_player) then
    raise exception 'unbekannter Spieler';
  end if;
  if p_code !~ '^([1-4][0-9a-z]{2}){1,100}$' then
    raise exception 'ungültiger Lauf';
  end if;
  -- Punkte müssen zur Summe der Treffer im Code passen (je Treffer 1–4)
  select sum(substr(p_code, i * 3 + 1, 1)::integer) into v_sum
  from generate_series(0, length(p_code) / 3 - 1) as i;
  if v_sum <> p_points then
    raise exception 'Punkte passen nicht';
  end if;
  -- Zeiten (Zehntelsekunden, 2 Zeichen Basis 36): ein Parcours dauert höchstens
  -- 30 s (späte Landungen zählen mit 30 s), und jeder Wurf fliegt eine Weile –
  -- mehr als ein Treffer je halbe Sekunde geht nicht (gegen erfundene Läufe)
  select sum(
    (strpos('0123456789abcdefghijklmnopqrstuvwxyz', substr(lower(p_code), i * 3 + 2, 1)) - 1) * 36
    + strpos('0123456789abcdefghijklmnopqrstuvwxyz', substr(lower(p_code), i * 3 + 3, 1)) - 1
  ) into v_ds
  from generate_series(0, length(p_code) / 3 - 1) as i;
  if v_ds > 310 or length(p_code) / 3 > 1 + v_ds / 5 then
    raise exception 'Zeiten passen nicht';
  end if;
  -- nur heute (±1 Tag wegen Zeitzonen)
  if p_day !~ '^\d{4}-\d{2}-\d{2}$' or p_day::date not between current_date - 1 and current_date + 1 then
    raise exception 'falscher Tag';
  end if;
  insert into parcours_runs (level, day, player, code, points)
  values (p_level, p_day, p_player, lower(p_code), p_points)
  on conflict (level, day, player) do update
    set code = excluded.code, points = excluded.points, created_at = now()
    where excluded.points > parcours_runs.points;
end;
$$;

-- Zufallsgegner: ein anderer Spieler von heute auf demselben Parcours mit
-- möglichst ähnlich vielen Punkten (unter den 5 nächsten zufällig)
create or replace function public.random_parcours_run(p_level integer, p_day text, p_player uuid, p_points integer)
returns table (name text, code text, points integer)
language sql
volatile
security definer
set search_path = public
as $$
  select name, code, points from (
    select p.name, r.code, r.points
    from parcours_runs r
    join players p on p.id = r.player
    where r.level = p_level and r.day = p_day and r.player <> p_player
    order by abs(r.points - p_points), r.created_at desc
    limit 5
  ) near
  order by random()
  limit 1;
$$;

-- Rangliste eines Parcours an einem Tag (Parcours des Tages); gleich viele
-- Punkte = gleicher Platz
create or replace function public.parcours_top(p_level integer, p_day text, p_player uuid, p_limit integer default 50)
returns table (rank bigint, name text, score integer, is_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  select rank() over (order by r.points desc), p.name, r.points, r.player = p_player
  from parcours_runs r
  join players p on p.id = r.player
  where r.level = p_level and r.day = p_day
  order by r.points desc, p.name
  limit greatest(1, least(p_limit, 100));
$$;

-- Eigener Platz (auch wenn man nicht unter den Besten steht)
create or replace function public.parcours_my_rank(p_level integer, p_day text, p_player uuid)
returns table (rank bigint, score integer)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select player, points, rank() over (order by points desc) as rank
    from parcours_runs
    where level = p_level and day = p_day
  )
  select rank, points from ranked where player = p_player;
$$;

-- Freund herausfordern: bester Parcours-Lauf eines Freundes von heute (code
-- null = Freund hat diesen Parcours heute noch nicht gespielt; keine Zeile =
-- kein Freund oder Code unbekannt)
create or replace function public.friend_parcours_run(p_player uuid, p_code text, p_level integer, p_day text)
returns table (name text, code text, points integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.name, r.code, r.points
  from friend_codes c
  join friends f on f.player = p_player and f.friend = c.player
  join players p on p.id = c.player
  left join parcours_runs r on r.player = c.player and r.level = p_level and r.day = p_day
  where c.code = p_code
  limit 1;
$$;

-- „Heute offen“ (Freundesliste): Freunde mit ihrem besten Lauf von heute auf
-- dem Parcours des Tages (nur, wer ihn gespielt hat). Ob man sie schon
-- geschlagen hat, rechnet die App selbst aus.
create or replace function public.friend_parcours_today(p_player uuid, p_level integer, p_day text)
returns table (name text, code text, points integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.name, c.code, r.points
  from friends f
  join players p on p.id = f.friend
  join friend_codes c on c.player = f.friend
  join parcours_runs r on r.player = f.friend and r.level = p_level and r.day = p_day
  where f.player = p_player;
$$;

grant execute on function public.submit_parcours_run(uuid, integer, text, text, integer) to anon, authenticated;
grant execute on function public.random_parcours_run(integer, text, uuid, integer) to anon, authenticated;
grant execute on function public.parcours_top(integer, text, uuid, integer) to anon, authenticated;
grant execute on function public.parcours_my_rank(integer, text, uuid) to anon, authenticated;
grant execute on function public.friend_parcours_run(uuid, text, integer, text) to anon, authenticated;
grant execute on function public.friend_parcours_today(uuid, integer, text) to anon, authenticated;
