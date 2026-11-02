-- Datei: supabase/freunde.sql
-- Freunde im Online-Bereich (ROADMAP R4e): Jeder Spieler hat einen festen
-- Freundes-Code (z. B. K7Q-X2M). Wer einen Code eingibt, ist mit dem anderen
-- befreundet – in beide Richtungen, ohne Anfrage. Die Liste zeigt je Freund
-- den besten Zeit-Sprint und Survival-Lauf dieser Woche. Höchstens 50 Freunde;
-- wer jemanden entfernt, sperrt ihn (er kann sich nicht wieder eintragen).
-- Einmal im Supabase-Projekt ausführen: Dashboard → SQL Editor → einfügen → Run.
-- Setzt supabase/rangliste.sql (players) und supabase/online.sql (online_runs)
-- voraus. Erneut ausführen ist unschädlich.
--
-- Datenschutz wie bei der Rangliste: Die Geräte-ID verlässt die Datenbank nie.
-- Freunde sieht man nur über Spitzname, Freundes-Code und Ergebnisse.

create table if not exists public.friend_codes (
  player uuid primary key references public.players (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$')
);

create table if not exists public.friends (
  player uuid not null references public.players (id) on delete cascade,
  friend uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player, friend),
  check (player <> friend)
);

-- Wer jemanden entfernt, sperrt ihn: der Entfernte kann sich mit dem Code
-- nicht wieder eintragen (nur der Sperrende selbst kann ihn neu hinzufügen)
create table if not exists public.friend_blocks (
  blocker uuid not null references public.players (id) on delete cascade,
  blocked uuid not null references public.players (id) on delete cascade,
  primary key (blocker, blocked)
);

alter table public.friend_codes enable row level security;
alter table public.friends enable row level security;
alter table public.friend_blocks enable row level security;
revoke all on public.friend_codes from anon, authenticated;
revoke all on public.friends from anon, authenticated;
revoke all on public.friend_blocks from anon, authenticated;

-- Eigener Freundes-Code (beim ersten Mal zufällig erzeugt; ohne 0/O/1/I)
create or replace function public.my_friend_code(p_player uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  found text;
  letters constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt integer := 0;
begin
  if not exists (select 1 from players where id = p_player) then
    raise exception 'unbekannter Spieler';
  end if;
  select code into found from friend_codes where player = p_player;
  while found is null and attempt < 10 loop
    attempt := attempt + 1;
    found := '';
    for i in 1..6 loop
      found := found || substr(letters, 1 + floor(random() * length(letters))::integer, 1);
    end loop;
    begin
      insert into friend_codes (player, code) values (p_player, found);
    exception when unique_violation then
      found := null;
      select code into found from friend_codes where player = p_player;
    end;
  end loop;
  return found;
end;
$$;

-- Freund per Code hinzufügen (beide Richtungen). Gibt den Spitznamen zurück.
create or replace function public.add_friend(p_player uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  other uuid;
  clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if not exists (select 1 from players where id = p_player) then
    raise exception 'unbekannter Spieler';
  end if;
  select player into other from friend_codes where code = clean;
  -- Gesperrt? Dann so tun, als gäbe es den Code nicht (verrät nichts)
  if other is null or exists (select 1 from friend_blocks where blocker = other and blocked = p_player) then
    raise exception 'unbekannter Code';
  end if;
  if other = p_player then
    raise exception 'eigener Code';
  end if;
  if exists (select 1 from friends where player = p_player and friend = other) then
    return (select name from players where id = other);
  end if;
  -- Grenze für beide Seiten – sonst wächst die Liste eines geteilten Codes endlos
  if (select count(*) from friends where player = p_player) >= 50 then
    raise exception 'zu viele Freunde';
  end if;
  if (select count(*) from friends where player = other) >= 50 then
    raise exception 'Liste des Freundes voll';
  end if;
  -- Wer selbst gesperrt hat, darf den anderen wieder hinzufügen
  delete from friend_blocks where blocker = p_player and blocked = other;
  insert into friends (player, friend) values (p_player, other), (other, p_player)
  on conflict do nothing;
  return (select name from players where id = other);
end;
$$;

-- Freund entfernen (beide Richtungen) und sperren – über seinen Freundes-Code
create or replace function public.remove_friend(p_player uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  other uuid;
begin
  select player into other from friend_codes
  where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if other is null or other = p_player or not exists (select 1 from players where id = p_player) then
    return;
  end if;
  delete from friends
  where (player = p_player and friend = other) or (player = other and friend = p_player);
  insert into friend_blocks (blocker, blocked) values (p_player, other) on conflict do nothing;
end;
$$;

-- Freundesliste mit den besten Läufen ab p_since (Montag der Woche)
create or replace function public.friend_list(p_player uuid, p_since text)
returns table (name text, code text, sprint integer, survival integer)
language sql
stable
security definer
set search_path = public
as $$
  select p.name, c.code,
    (select max(r.correct) from online_runs r
      where r.player = f.friend and r.mode = 'sprint' and r.day >= p_since),
    (select max(r.correct) from online_runs r
      where r.player = f.friend and r.mode = 'survival' and r.day >= p_since)
  from friends f
  join players p on p.id = f.friend
  join friend_codes c on c.player = f.friend
  where f.player = p_player
  order by p.name
  limit 50;
$$;

grant execute on function public.my_friend_code(uuid) to anon, authenticated;
grant execute on function public.add_friend(uuid, text) to anon, authenticated;
grant execute on function public.remove_friend(uuid, text) to anon, authenticated;
grant execute on function public.friend_list(uuid, text) to anon, authenticated;
