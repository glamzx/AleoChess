-- Store catalog, inventory, purchase/equip RPCs, and Pro gates.
-- 0009_retention.sql already exists, so this implements the requested
-- 0009_store.sql as the next available migration.

create table if not exists public.items (
  id text primary key,
  kind text not null check (kind in ('board','pieces','background','effect','flair')),
  name jsonb not null,
  description jsonb,
  rarity text not null check (rarity in ('common','rare','epic','legendary','mythic')),
  price_coins integer,
  price_usd_cents integer,
  pro_only boolean not null default false,
  metadata jsonb,
  released_at timestamptz not null default now(),
  retired_at timestamptz
);

create table if not exists public.user_inventory (
  user_id uuid not null references public.profiles(id),
  item_id text not null references public.items(id),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.items enable row level security;
alter table public.user_inventory enable row level security;

drop policy if exists items_public_read on public.items;
create policy items_public_read on public.items for select using (retired_at is null);

drop policy if exists inv_self_read on public.user_inventory;
create policy inv_self_read on public.user_inventory for select using (auth.uid() = user_id);

create index if not exists items_kind_rarity_idx on public.items(kind, rarity);
create index if not exists user_inventory_user_equipped_idx on public.user_inventory(user_id, equipped);

create table if not exists public.coach_explanation_usage (
  user_id uuid not null references public.profiles(id),
  date date not null,
  used integer not null default 0,
  primary key (user_id, date)
);

alter table public.coach_explanation_usage enable row level security;
drop policy if exists coach_usage_self_read on public.coach_explanation_usage;
create policy coach_usage_self_read on public.coach_explanation_usage for select using (auth.uid() = user_id);

create or replace function public.is_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and pro_until is not null
      and pro_until > now()
  )
$$;

create or replace function public.consume_coach_explanation(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := timezone('utc', now())::date;
  v_used integer;
begin
  if public.is_pro(p_user_id) then
    return jsonb_build_object('ok', true, 'pro', true, 'remaining', null);
  end if;

  insert into public.coach_explanation_usage (user_id, date, used)
  values (p_user_id, v_today, 0)
  on conflict (user_id, date) do nothing;

  select used into v_used
  from public.coach_explanation_usage
  where user_id = p_user_id
    and date = v_today
  for update;

  if v_used >= 3 then
    return jsonb_build_object('ok', false, 'pro', false, 'remaining', 0, 'error', 'Daily free AI Coach limit reached');
  end if;

  update public.coach_explanation_usage
  set used = used + 1
  where user_id = p_user_id
    and date = v_today
  returning used into v_used;

  return jsonb_build_object('ok', true, 'pro', false, 'remaining', greatest(0, 3 - v_used));
end;
$$;

create or replace function public.can_access_lesson(p_content_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return false;
  end if;

  if p_content_id like 'bigtech.%' or p_content_id like 'interview.%' then
    return public.is_pro(v_user_id);
  end if;

  return true;
end;
$$;

insert into public.items (id, kind, name, description, rarity, price_coins, price_usd_cents, pro_only, metadata)
values
  ('board.default', 'board', '{"en":"Classic Ocean","ru":"Классика Океан","kk":"Классикалық Мұхит"}', '{"en":"The default Aleo board.","ru":"Стандартная доска Aleo.","kk":"Aleo стандарт тақтасы."}', 'common', 0, null, false, '{"board_theme":"ocean","swatch":["#EAF4FF","#6CB7FF"]}'),
  ('board.steppe.free', 'board', '{"en":"Steppe Sand","ru":"Степной песок","kk":"Дала құмы"}', '{"en":"Warm light squares and sunset files.","ru":"Теплая доска в степных тонах.","kk":"Дала түстеріндегі жылы тақта."}', 'common', 0, null, false, '{"board_theme":"steppe","swatch":["#FFF5DC","#FFB14B"]}'),
  ('board.candy.free', 'board', '{"en":"Candy Lines","ru":"Конфетные линии","kk":"Кәмпит сызықтар"}', '{"en":"Bright training board.","ru":"Яркая тренировочная доска.","kk":"Жарқын жаттығу тақтасы."}', 'common', 0, null, false, '{"board_theme":"candy","swatch":["#FFE0F0","#FF7AB6"]}'),
  ('board.noir.free', 'board', '{"en":"Noir Starter","ru":"Нуар старт","kk":"Нуар старт"}', '{"en":"Quiet high-contrast board.","ru":"Спокойная контрастная доска.","kk":"Жоғары контрастты тақта."}', 'common', 0, null, false, '{"board_theme":"noir","swatch":["#E8EDF5","#3A4A66"]}'),
  ('board.sky.free', 'board', '{"en":"Sky Practice","ru":"Небесная практика","kk":"Аспан жаттығуы"}', '{"en":"Free board for daily practice.","ru":"Бесплатная доска для практики.","kk":"Күнделікті жаттығуға тегін тақта."}', 'common', 0, null, false, '{"board_theme":"ocean","swatch":["#F4FBFF","#2AB2FF"]}'),

  ('pieces.default', 'pieces', '{"en":"Aleo Classic","ru":"Aleo классика","kk":"Aleo классика"}', '{"en":"Default cartoon pieces.","ru":"Стандартные мультяшные фигуры.","kk":"Стандарт мультфильм тастары."}', 'common', 0, null, false, '{"piece_theme":"cartoon"}'),
  ('pieces.wood', 'pieces', '{"en":"Wood Club","ru":"Деревянный клуб","kk":"Ағаш клуб"}', '{"en":"Unlock with coins.","ru":"Открывается за монеты.","kk":"Монетамен ашылады."}', 'common', 100, null, false, '{"piece_theme":"classic"}'),
  ('pieces.neon', 'pieces', '{"en":"Neon Knights","ru":"Неоновые кони","kk":"Неон аттар"}', '{"en":"Bright blitz pieces.","ru":"Яркие блиц-фигуры.","kk":"Жарқын блиц тастары."}', 'rare', 200, null, false, '{"piece_theme":"cartoon"}'),
  ('pieces.marble', 'pieces', '{"en":"Marble Set","ru":"Мраморный набор","kk":"Мәрмәр жинақ"}', '{"en":"Clean tournament look.","ru":"Чистый турнирный стиль.","kk":"Турнирлік таза стиль."}', 'rare', 200, null, false, '{"piece_theme":"classic"}'),
  ('pieces.pixel', 'pieces', '{"en":"Pixel Set","ru":"Пиксельный набор","kk":"Пиксель жинақ"}', '{"en":"Retro board energy.","ru":"Ретро-стиль для доски.","kk":"Ретро тақта көңілі."}', 'epic', 350, null, false, '{"piece_theme":"cartoon"}'),

  ('board.lagoon', 'board', '{"en":"Blue Lagoon","ru":"Синяя лагуна","kk":"Көк лагуна"}', '{"en":"Rare ocean board.","ru":"Редкая океанская доска.","kk":"Сирек мұхит тақтасы."}', 'rare', 200, null, false, '{"board_theme":"ocean","swatch":["#DFF6FF","#2AA7F7"]}'),
  ('board.tundra', 'board', '{"en":"Tundra Blue","ru":"Синяя тундра","kk":"Көк тундра"}', '{"en":"Cold focus board.","ru":"Холодная доска для фокуса.","kk":"Суық фокус тақтасы."}', 'rare', 200, null, false, '{"board_theme":"noir","swatch":["#EDF6FF","#6A7FA8"]}'),
  ('board.mint', 'board', '{"en":"Mint File","ru":"Мятная линия","kk":"Жалбыз сызық"}', '{"en":"Soft green-blue board.","ru":"Мягкая зелено-синяя доска.","kk":"Жұмсақ жасыл-көк тақта."}', 'rare', 200, null, false, '{"board_theme":"ocean","swatch":["#E9FFF8","#50C9A7"]}'),
  ('board.sunset', 'board', '{"en":"Steppe Sunset","ru":"Степной закат","kk":"Дала күні"}', '{"en":"Golden rare board.","ru":"Золотая редкая доска.","kk":"Алтын сирек тақта."}', 'rare', 200, null, false, '{"board_theme":"steppe","swatch":["#FFF0D2","#F59E42"]}'),
  ('board.rose', 'board', '{"en":"Rose Grid","ru":"Розовая сетка","kk":"Раушан тор"}', '{"en":"Soft candy board.","ru":"Мягкая розовая доска.","kk":"Жұмсақ қызғылт тақта."}', 'rare', 200, null, false, '{"board_theme":"candy","swatch":["#FFEAF4","#F472B6"]}'),
  ('board.storm', 'board', '{"en":"Storm Grid","ru":"Штормовая сетка","kk":"Дауыл тор"}', '{"en":"Deep contrast board.","ru":"Контрастная доска.","kk":"Контраст тақта."}', 'rare', 200, null, false, '{"board_theme":"noir","swatch":["#DCE5F2","#26344F"]}'),
  ('board.aqua', 'board', '{"en":"Aqua Rank","ru":"Аква горизонталь","kk":"Аква қатар"}', '{"en":"Clean aqua theme.","ru":"Чистая аква-тема.","kk":"Таза аква тақырып."}', 'rare', 200, null, false, '{"board_theme":"ocean","swatch":["#E0FAFF","#38BDF8"]}'),
  ('board.apricot', 'board', '{"en":"Apricot Board","ru":"Абрикосовая доска","kk":"Өрік тақта"}', '{"en":"Warm rare board.","ru":"Теплая редкая доска.","kk":"Жылы сирек тақта."}', 'rare', 200, null, false, '{"board_theme":"steppe","swatch":["#FFF7DF","#FB923C"]}'),

  ('board.cyber', 'board', '{"en":"Cyber Board","ru":"Кибер-доска","kk":"Кибер тақта"}', '{"en":"Epic Battle Pass board.","ru":"Эпическая доска боевого пропуска.","kk":"Жауынгерлік пропуск эпик тақтасы."}', 'epic', 500, null, false, '{"board_theme":"noir","battlepass_unlock":true,"swatch":["#D9F99D","#111827"]}'),
  ('board.aurora', 'board', '{"en":"Aurora Board","ru":"Аврора","kk":"Аврора"}', '{"en":"Epic aurora colors.","ru":"Эпические цвета авроры.","kk":"Эпик аврора түстері."}', 'epic', 500, null, false, '{"board_theme":"candy","battlepass_unlock":true,"swatch":["#F0ABFC","#38BDF8"]}'),
  ('board.crystal', 'board', '{"en":"Crystal Board","ru":"Кристалл","kk":"Кристалл"}', '{"en":"Sharp epic board.","ru":"Строгая эпическая доска.","kk":"Айқын эпик тақта."}', 'epic', 500, null, false, '{"board_theme":"ocean","battlepass_unlock":true,"swatch":["#EFF6FF","#818CF8"]}'),
  ('board.volcano', 'board', '{"en":"Volcano Board","ru":"Вулкан","kk":"Жанартау"}', '{"en":"Epic warm board.","ru":"Теплая эпическая доска.","kk":"Жылы эпик тақта."}', 'epic', 500, null, false, '{"board_theme":"steppe","battlepass_unlock":true,"swatch":["#FEF3C7","#DC2626"]}'),
  ('board.prism', 'board', '{"en":"Prism Board","ru":"Призма","kk":"Призма"}', '{"en":"Colorful epic board.","ru":"Цветная эпическая доска.","kk":"Түсті эпик тақта."}', 'epic', 500, null, false, '{"board_theme":"candy","battlepass_unlock":true,"swatch":["#FCE7F3","#22D3EE"]}'),

  ('board.gold', 'board', '{"en":"Royal Gold","ru":"Королевское золото","kk":"Патша алтыны"}', '{"en":"Legendary Pro board.","ru":"Легендарная Pro-доска.","kk":"Легендар Pro тақта."}', 'legendary', null, 999, true, '{"board_theme":"steppe","swatch":["#FFF7C2","#D4AF37"]}'),
  ('board.cosmos', 'board', '{"en":"Cosmos Board","ru":"Космос","kk":"Ғарыш"}', '{"en":"Legendary Pro board.","ru":"Легендарная Pro-доска.","kk":"Легендар Pro тақта."}', 'legendary', null, 999, true, '{"board_theme":"noir","swatch":["#E0E7FF","#111827"]}'),
  ('board.obsidian', 'board', '{"en":"Obsidian Board","ru":"Обсидиан","kk":"Обсидиан"}', '{"en":"Legendary Pro board.","ru":"Легендарная Pro-доска.","kk":"Легендар Pro тақта."}', 'legendary', null, 999, true, '{"board_theme":"noir","swatch":["#CBD5E1","#020617"]}'),
  ('board.mythic.dragon', 'board', '{"en":"Dragon Event","ru":"Событие Дракон","kk":"Айдаһар оқиғасы"}', '{"en":"Mythic event-locked board.","ru":"Мифическая доска события.","kk":"Мифтік оқиға тақтасы."}', 'mythic', null, null, false, '{"board_theme":"steppe","event_locked":true,"swatch":["#FEF2F2","#991B1B"]}'),
  ('board.mythic.eclipse', 'board', '{"en":"Eclipse Event","ru":"Событие Затмение","kk":"Тұтылу оқиғасы"}', '{"en":"Mythic event-locked board.","ru":"Мифическая доска события.","kk":"Мифтік оқиға тақтасы."}', 'mythic', null, null, false, '{"board_theme":"noir","event_locked":true,"swatch":["#F8FAFC","#0F172A"]}'),

  ('pieces.glass', 'pieces', '{"en":"Glass Pieces","ru":"Стеклянные фигуры","kk":"Шыны тастар"}', '{"en":"Rare translucent set.","ru":"Редкий стеклянный набор.","kk":"Сирек шыны жинақ."}', 'rare', 220, null, false, '{"piece_theme":"classic"}'),
  ('pieces.royal', 'pieces', '{"en":"Royal Pieces","ru":"Королевские фигуры","kk":"Патша тастары"}', '{"en":"Epic regal set.","ru":"Эпический королевский набор.","kk":"Эпик патша жинағы."}', 'epic', 500, null, false, '{"piece_theme":"classic"}'),
  ('pieces.cosmic', 'pieces', '{"en":"Cosmic Pieces","ru":"Космические фигуры","kk":"Ғарыш тастары"}', '{"en":"Legendary Pro pieces.","ru":"Легендарные Pro-фигуры.","kk":"Легендар Pro тастары."}', 'legendary', null, 999, true, '{"piece_theme":"cartoon"}'),
  ('pieces.ink', 'pieces', '{"en":"Ink Pieces","ru":"Чернильные фигуры","kk":"Сия тастары"}', '{"en":"Epic inked set.","ru":"Эпический чернильный набор.","kk":"Эпик сия жинағы."}', 'epic', 450, null, false, '{"piece_theme":"classic"}'),
  ('pieces.mythic.star', 'pieces', '{"en":"Starlight Pieces","ru":"Звездные фигуры","kk":"Жұлдыз тастары"}', '{"en":"Mythic event pieces.","ru":"Мифические фигуры события.","kk":"Мифтік оқиға тастары."}', 'mythic', null, null, false, '{"event_locked":true,"piece_theme":"cartoon"}'),

  ('background.sky', 'background', '{"en":"Sky Room","ru":"Небесная комната","kk":"Аспан бөлме"}', '{"en":"Soft blue game background.","ru":"Мягкий синий фон.","kk":"Жұмсақ көк фон."}', 'common', 80, null, false, '{"gradient":["#F0F9FF","#FFFFFF"]}'),
  ('background.city', 'background', '{"en":"City Lights","ru":"Огни города","kk":"Қала шамдары"}', '{"en":"Night match background.","ru":"Ночной фон матча.","kk":"Түнгі матч фоны."}', 'rare', 180, null, false, '{"gradient":["#DBEAFE","#1E3A8A"]}'),
  ('background.steppe', 'background', '{"en":"Open Steppe","ru":"Открытая степь","kk":"Ашық дала"}', '{"en":"Warm game background.","ru":"Теплый игровой фон.","kk":"Жылы ойын фоны."}', 'rare', 180, null, false, '{"gradient":["#FEF3C7","#FFFFFF"]}'),
  ('background.aurora', 'background', '{"en":"Aurora Hall","ru":"Зал Авроры","kk":"Аврора залы"}', '{"en":"Epic background.","ru":"Эпический фон.","kk":"Эпик фон."}', 'epic', 400, null, false, '{"gradient":["#F5D0FE","#BAE6FD"]}'),
  ('background.pro', 'background', '{"en":"Pro Studio","ru":"Pro студия","kk":"Pro студия"}', '{"en":"Pro-only background.","ru":"Фон только для Pro.","kk":"Тек Pro фоны."}', 'legendary', null, 999, true, '{"gradient":["#111827","#FBBF24"]}'),

  ('effect.pop', 'effect', '{"en":"Capture Pop","ru":"Хлопок взятия","kk":"Алу поп"}', '{"en":"Small capture pop.","ru":"Маленький эффект взятия.","kk":"Кішкентай алу әсері."}', 'common', 60, null, false, '{"effect":"pop"}'),
  ('effect.spark', 'effect', '{"en":"Spark Burst","ru":"Вспышка искр","kk":"Ұшқын жарқылы"}', '{"en":"Rare capture spark.","ru":"Редкая вспышка.","kk":"Сирек ұшқын."}', 'rare', 180, null, false, '{"effect":"spark"}'),
  ('effect.explosion', 'effect', '{"en":"Tiny Explosion","ru":"Маленький взрыв","kk":"Кішкентай жарылыс"}', '{"en":"Small explosion sprite.","ru":"Маленький спрайт взрыва.","kk":"Кішкентай жарылыс спрайты."}', 'epic', 400, null, false, '{"effect":"explosion"}'),
  ('effect.pro.gold', 'effect', '{"en":"Gold Capture","ru":"Золотое взятие","kk":"Алтын алу"}', '{"en":"Pro-only capture effect.","ru":"Эффект только для Pro.","kk":"Тек Pro әсері."}', 'legendary', null, 999, true, '{"effect":"gold"}'),

  ('flair.rookie', 'flair', '{"en":"Rookie","ru":"Новичок","kk":"Жаңа ойыншы"}', '{"en":"Starter profile flair.","ru":"Стартовый значок профиля.","kk":"Бастапқы профиль белгісі."}', 'common', 50, null, false, '{"label":"Rookie"}'),
  ('flair.tactician', 'flair', '{"en":"Tactician","ru":"Тактик","kk":"Тактик"}', '{"en":"For puzzle hunters.","ru":"Для любителей задач.","kk":"Есеп аңшыларына."}', 'rare', 150, null, false, '{"label":"Tactician"}'),
  ('flair.climber', 'flair', '{"en":"Climber","ru":"Скалолаз","kk":"Шыңға шыққыш"}', '{"en":"For Elo climbers.","ru":"Для тех, кто растет в Elo.","kk":"Elo өсірушілерге."}', 'rare', 150, null, false, '{"label":"Climber"}'),
  ('flair.cityhero', 'flair', '{"en":"City Hero","ru":"Герой города","kk":"Қала батыры"}', '{"en":"Represent your city.","ru":"Представляй свой город.","kk":"Қалаңды таныт."}', 'epic', 350, null, false, '{"label":"City Hero"}'),
  ('flair.royale', 'flair', '{"en":"Royale","ru":"Royale","kk":"Royale"}', '{"en":"Premium profile flair.","ru":"Премиальный значок.","kk":"Премиум белгі."}', 'legendary', null, 999, true, '{"label":"Royale"}'),
  ('flair.eclipse', 'flair', '{"en":"Eclipse","ru":"Затмение","kk":"Тұтылу"}', '{"en":"Mythic event flair.","ru":"Мифический значок события.","kk":"Мифтік оқиға белгісі."}', 'mythic', null, null, false, '{"event_locked":true,"label":"Eclipse"}')
on conflict (id) do update set
  kind = excluded.kind,
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  price_coins = excluded.price_coins,
  price_usd_cents = excluded.price_usd_cents,
  pro_only = excluded.pro_only,
  metadata = excluded.metadata,
  retired_at = excluded.retired_at;

create or replace function public.ensure_default_inventory(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  insert into public.user_inventory (user_id, item_id, equipped)
  select p_user_id, id, kind in ('board', 'pieces')
  from public.items
  where price_coins = 0
    and coalesce(pro_only, false) = false
    and retired_at is null
    and id in ('board.default', 'pieces.default')
  on conflict (user_id, item_id) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.purchase_item(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.items%rowtype;
  v_profile public.profiles%rowtype;
  v_inventory public.user_inventory%rowtype;
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id
    and retired_at is null;

  if not found then
    raise exception 'Item not found';
  end if;

  if coalesce((v_item.metadata->>'event_locked')::boolean, false) then
    raise exception 'Item is event locked';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_item.pro_only and not public.is_pro(v_user_id) then
    raise exception 'Pro subscription required';
  end if;

  if exists (
    select 1 from public.user_inventory
    where user_id = v_user_id and item_id = p_item_id
  ) then
    select * into v_inventory
    from public.user_inventory
    where user_id = v_user_id and item_id = p_item_id;

    return jsonb_build_object(
      'ok', true,
      'already_owned', true,
      'coin_balance', v_profile.coin_balance,
      'inventory', row_to_json(v_inventory)
    );
  end if;

  if coalesce(v_item.price_coins, 0) > 0 then
    if v_profile.coin_balance < v_item.price_coins then
      raise exception 'Not enough coins';
    end if;

    insert into public.coin_transactions (user_id, amount, reason, metadata)
    values (
      v_user_id,
      -v_item.price_coins,
      'shop_purchase',
      jsonb_build_object('item_id', v_item.id, 'kind', v_item.kind)
    );
  end if;

  insert into public.user_inventory (user_id, item_id)
  values (v_user_id, p_item_id)
  returning * into v_inventory;

  select * into v_profile from public.profiles where id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'coin_balance', v_profile.coin_balance,
    'inventory', row_to_json(v_inventory)
  );
end;
$$;

create or replace function public.equip_item(p_item_id text, p_equipped boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.items%rowtype;
  v_inventory public.user_inventory%rowtype;
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;

  select i.* into v_item
  from public.items i
  join public.user_inventory inv on inv.item_id = i.id
  where inv.user_id = v_user_id
    and i.id = p_item_id;

  if not found then
    raise exception 'Item is not owned';
  end if;

  if v_item.pro_only and not public.is_pro(v_user_id) then
    raise exception 'Pro subscription required';
  end if;

  if p_equipped then
    update public.user_inventory inv
    set equipped = false
    from public.items i
    where inv.item_id = i.id
      and inv.user_id = v_user_id
      and i.kind = v_item.kind;
  end if;

  update public.user_inventory
  set equipped = p_equipped
  where user_id = v_user_id
    and item_id = p_item_id
  returning * into v_inventory;

  return jsonb_build_object('ok', true, 'inventory', row_to_json(v_inventory));
end;
$$;

create or replace function public.get_storefront()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
  v_inventory jsonb;
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;

  perform public.ensure_default_inventory(v_user_id);
  select * into v_profile from public.profiles where id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'kind', i.kind,
    'name', i.name,
    'description', i.description,
    'rarity', i.rarity,
    'price_coins', i.price_coins,
    'price_usd_cents', i.price_usd_cents,
    'pro_only', i.pro_only,
    'metadata', i.metadata,
    'owned', inv.item_id is not null,
    'equipped', coalesce(inv.equipped, false),
    'acquired_at', inv.acquired_at
  ) order by i.kind, i.rarity, i.price_coins nulls last, i.id), '[]'::jsonb)
  into v_items
  from public.items i
  left join public.user_inventory inv on inv.item_id = i.id and inv.user_id = v_user_id
  where i.retired_at is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id', inv.item_id,
    'equipped', inv.equipped,
    'kind', i.kind,
    'metadata', i.metadata
  )), '[]'::jsonb)
  into v_inventory
  from public.user_inventory inv
  join public.items i on i.id = inv.item_id
  where inv.user_id = v_user_id;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'coin_balance', v_profile.coin_balance,
      'pro', public.is_pro(v_user_id),
      'pro_until', v_profile.pro_until
    ),
    'items', v_items,
    'inventory', v_inventory
  );
end;
$$;

create or replace function public.dev_grant_pro(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Must be signed in';
  end if;

  update public.profiles
  set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(days => greatest(1, least(p_days, 365)))
  where id = v_user_id
  returning * into v_profile;

  insert into public.coin_transactions (user_id, amount, reason, metadata)
  values (v_user_id, 0, 'admin_grant', jsonb_build_object('grant', 'pro', 'days', p_days));

  return jsonb_build_object('ok', true, 'pro_until', v_profile.pro_until);
end;
$$;

grant execute on function public.is_pro(uuid) to authenticated, service_role;
grant execute on function public.consume_coach_explanation(uuid) to authenticated, service_role;
grant execute on function public.can_access_lesson(text) to authenticated, service_role;
grant execute on function public.purchase_item(text) to authenticated;
grant execute on function public.equip_item(text, boolean) to authenticated;
grant execute on function public.get_storefront() to authenticated;
grant execute on function public.dev_grant_pro(integer) to authenticated;
