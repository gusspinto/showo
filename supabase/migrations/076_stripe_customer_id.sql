-- Add stripe_customer_id to profiles for linking Supabase users to Stripe customers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Allow authenticated users to read their own stripe_customer_id
GRANT SELECT (stripe_customer_id) ON profiles TO authenticated;
