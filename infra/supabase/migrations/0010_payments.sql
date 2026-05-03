-- Migration: 0010_payments.sql
-- Payment infrastructure for Stripe + YooKassa

-- ============================================================
-- 1. Payment Intents — tracks every checkout attempt
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'yookassa')),
  provider_id TEXT NOT NULL,                  -- Stripe PaymentIntent ID or YooKassa payment ID
  product_type TEXT NOT NULL CHECK (product_type IN ('pro_monthly', 'pro_annual', 'coin_pack', 'battle_pass')),
  product_meta JSONB DEFAULT '{}'::jsonb,     -- e.g. { "coins": 500 }
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')),
  idempotency_key TEXT UNIQUE,                -- prevent duplicate processing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_intents_user ON public.payment_intents(user_id);
CREATE INDEX idx_payment_intents_provider_id ON public.payment_intents(provider_id);

-- ============================================================
-- 2. Subscriptions — Pro membership tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'yookassa')),
  provider_subscription_id TEXT,              -- Stripe subscription ID
  provider_customer_id TEXT,                  -- Stripe customer ID or YooKassa payer ID
  plan TEXT NOT NULL CHECK (plan IN ('pro_monthly', 'pro_annual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,             -- = pro_until
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_user_active ON public.subscriptions(user_id) WHERE status = 'active';
CREATE INDEX idx_subscriptions_provider_id ON public.subscriptions(provider_subscription_id);

-- ============================================================
-- 3. Purchases — one-time purchases (coins, battle pass)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_intent_id UUID REFERENCES public.payment_intents(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('coin_pack', 'battle_pass', 'skin')),
  product_meta JSONB DEFAULT '{}'::jsonb,     -- e.g. { "coins": 500, "pack": "500" }
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchases_user ON public.purchases(user_id);

-- ============================================================
-- 4. Add pro_until to profiles (if not exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pro_until'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN pro_until TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'yookassa_payer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN yookassa_payer_id TEXT;
  END IF;
END $$;

-- ============================================================
-- 5. Coin transactions table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,                    -- positive = credit, negative = debit
  reason TEXT NOT NULL CHECK (reason IN ('shop_purchase', 'quest_reward', 'game_reward', 'daily_bonus', 'refund', 'admin')),
  reference_id UUID,                          -- link to purchase or quest
  balance_after INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coin_transactions_user ON public.coin_transactions(user_id);

-- ============================================================
-- 6. RLS policies
-- ============================================================

-- Payment intents: users can read their own
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payment intents" ON public.payment_intents
  FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions: users can read their own
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Purchases: users can read their own
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Coin transactions: users can read their own
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 7. Helper function: credit coins to user
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'shop_purchase',
  p_reference_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT COALESCE(coins, 0) INTO v_current_balance
  FROM public.profiles WHERE id = p_user_id;
  
  v_new_balance := v_current_balance + p_amount;
  
  -- Update profile
  UPDATE public.profiles SET coins = v_new_balance WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.coin_transactions (user_id, amount, reason, reference_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id, v_new_balance);
  
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
