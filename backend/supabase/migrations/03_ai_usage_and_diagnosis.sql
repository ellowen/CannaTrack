-- Migracion 03: rate limiting IA + historial de diagnosticos + columna is_pro

-- ── is_pro en profiles ───────────────────────────────────────────────
-- Gestionado por RevenueCat webhook o funcion de pago.
alter table profiles
  add column if not exists is_pro boolean default false not null;

-- ── ai_usage ─────────────────────────────────────────────────────────
-- Un registro por usuario por mes. Se incrementa en la Edge Function.
create table if not exists ai_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users on delete cascade not null,
  month             text not null,   -- formato 'yyyy-MM', eg. '2026-05'
  diagnosis_count   int  default 0  not null check (diagnosis_count >= 0),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (user_id, month)
);

alter table ai_usage enable row level security;

create policy "ai_usage: own" on ai_usage
  for all using (auth.uid() = user_id);

create index if not exists idx_ai_usage_user_month on ai_usage (user_id, month);

-- ── diagnosis_logs ───────────────────────────────────────────────────
-- Historial de diagnosticos de cada planta.
create table if not exists diagnosis_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users on delete cascade not null,
  plant_id         uuid references plants on delete cascade not null,
  photo_url        text default '',
  health_score     int  check (health_score between 0 and 100),
  summary          text,
  issues           jsonb default '[]',
  recommendations  jsonb default '[]',
  created_at       timestamptz default now()
);

alter table diagnosis_logs enable row level security;

create policy "diagnosis_logs: own" on diagnosis_logs
  for all using (auth.uid() = user_id);

create index if not exists idx_diagnosis_plant on diagnosis_logs (plant_id, created_at desc);
create index if not exists idx_diagnosis_user  on diagnosis_logs (user_id, created_at desc);
