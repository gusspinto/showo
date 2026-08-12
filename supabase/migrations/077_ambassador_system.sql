-- Ambassadors table
CREATE TABLE ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.20 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  stripe_connect_account_id text,
  stripe_connect_onboarded boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  CONSTRAINT ambassadors_user_id_key UNIQUE (user_id),
  CONSTRAINT ambassadors_referral_code_key UNIQUE (referral_code),
  CONSTRAINT ambassadors_referral_code_check CHECK (referral_code ~ '^[a-z0-9_]{3,30}$')
);

-- Referrals table
CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES ambassadors(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_coupon_id text,
  commission_ends_at timestamptz,
  total_commission_earned numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_referred_user_id_key UNIQUE (referred_user_id)
);

-- Add referred_by to profiles
ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES ambassadors(id);

-- RLS: ambassadors
ALTER TABLE ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ambassadors_select_own"
  ON ambassadors FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ambassadors_admin_select"
  ON ambassadors FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "ambassadors_service_role"
  ON ambassadors FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- RLS: referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_own"
  ON referrals FOR SELECT TO authenticated
  USING (ambassador_id IN (SELECT id FROM ambassadors WHERE user_id = auth.uid()));

CREATE POLICY "referrals_service_role"
  ON referrals FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grant access
GRANT SELECT ON ambassadors TO authenticated;
GRANT SELECT ON referrals TO authenticated;

-- RPC: admin creates ambassador
CREATE OR REPLACE FUNCTION admin_create_ambassador(
  target_user_id uuid,
  code text,
  rate numeric DEFAULT 0.20
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_admin boolean;
  new_id uuid;
BEGIN
  SELECT is_admin INTO caller_admin FROM profiles WHERE id = auth.uid();
  IF NOT caller_admin THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO ambassadors (user_id, referral_code, commission_rate, created_by)
  VALUES (target_user_id, lower(code), rate, auth.uid())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- RPC: claim referral (called after signup)
CREATE OR REPLACE FUNCTION claim_referral(code text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  amb_id uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;

  -- Check user not already referred
  IF EXISTS (SELECT 1 FROM profiles WHERE id = uid AND referred_by IS NOT NULL) THEN
    RETURN false;
  END IF;

  -- Find ambassador
  SELECT id INTO amb_id FROM ambassadors WHERE referral_code = lower(code) AND active = true;
  IF amb_id IS NULL THEN RETURN false; END IF;

  -- Don't allow self-referral
  IF EXISTS (SELECT 1 FROM ambassadors WHERE id = amb_id AND user_id = uid) THEN
    RETURN false;
  END IF;

  -- Set referred_by
  UPDATE profiles SET referred_by = amb_id WHERE id = uid;

  -- Create referral record
  INSERT INTO referrals (ambassador_id, referred_user_id)
  VALUES (amb_id, uid)
  ON CONFLICT (referred_user_id) DO NOTHING;

  RETURN true;
END;
$$;

-- RPC: get ambassador stats
CREATE OR REPLACE FUNCTION get_ambassador_stats()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  uid uuid := auth.uid();
  amb_id uuid;
  result json;
BEGIN
  SELECT id INTO amb_id FROM ambassadors WHERE user_id = uid;
  IF amb_id IS NULL THEN RETURN '{}'::json; END IF;

  SELECT json_build_object(
    'total_signups', (SELECT count(*) FROM referrals WHERE ambassador_id = amb_id),
    'paid_conversions', (SELECT count(*) FROM referrals r JOIN profiles p ON p.id = r.referred_user_id WHERE r.ambassador_id = amb_id AND p.plan != 'free'),
    'total_earned', (SELECT coalesce(sum(total_commission_earned), 0) FROM referrals WHERE ambassador_id = amb_id),
    'active_commissions', (SELECT count(*) FROM referrals WHERE ambassador_id = amb_id AND commission_ends_at > now()),
    'referral_code', (SELECT referral_code FROM ambassadors WHERE id = amb_id),
    'stripe_connect_onboarded', (SELECT stripe_connect_onboarded FROM ambassadors WHERE id = amb_id)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_ambassador TO authenticated;
GRANT EXECUTE ON FUNCTION claim_referral TO authenticated;
GRANT EXECUTE ON FUNCTION get_ambassador_stats TO authenticated;
