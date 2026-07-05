-- Grant Admin access to transactions table
CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all transactions"
  ON transactions FOR UPDATE
  USING (public.is_admin());

-- Grant Admin access to payouts table
CREATE POLICY "Admins can view all payouts"
  ON payouts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all payouts"
  ON payouts FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can insert payouts"
  ON payouts FOR INSERT
  WITH CHECK (public.is_admin());
