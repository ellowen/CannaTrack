-- Modelo comercial: 30 dias de prueba gratis + suscripcion.
--
-- 1) profiles.trial_ends_at: arranca automaticamente al registrarse
--    (default now()+30d se aplica en el INSERT del trigger handle_new_user).
--    Backfill para usuarios existentes: 30 dias desde hoy (gesto de gracia).
-- 2) Tabla subscriptions: pluggable para Stripe / MercadoPago / RevenueCat.
--    El frontend NO habla con el gateway: solo lee profiles.is_pro +
--    trial_ends_at. Un webhook del gateway (edge function) upsertea aca
--    y actualiza profiles.is_pro — igual que ya hace revenuecat-webhook.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

CREATE TABLE IF NOT EXISTS subscriptions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  provider                  text NOT NULL CHECK (provider IN ('stripe', 'mercadopago', 'revenuecat', 'manual')),
  provider_subscription_id  text,
  status                    text NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
  current_period_end        timestamptz,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- El usuario puede VER su suscripcion; solo el backend (service role via
-- webhooks) escribe. Sin policy de INSERT/UPDATE para authenticated.
DROP POLICY IF EXISTS "subscriptions: read own" ON subscriptions;
CREATE POLICY "subscriptions: read own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
