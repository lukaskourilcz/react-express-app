-- The owner's voluntary 14-day refund is taken once per account.
-- claim_voluntary_refund answers TRUE to the first subscription that asks and
-- to that same subscription again (a withdrawal retried after a failure), and
-- FALSE to any other subscription of the account, or to an account without a
-- billing customer.

INSERT INTO auth.users (id) VALUES
  ('bbbbbbbb-0000-4000-8000-000000000163'),
  ('bbbbbbbb-0000-4000-8000-000000000164'),
  ('bbbbbbbb-0000-4000-8000-000000000165');

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user   CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000163';
  v_other  CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000164';
  v_nobody CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000165';
  v_at     TIMESTAMPTZ;
  v_sub    TEXT;
BEGIN
  ASSERT NOT public.claim_voluntary_refund(v_nobody, 'sub_refund163'), 'no billing customer, no refund';

  PERFORM public.link_billing_customer(v_user, 'cus_refund163');
  PERFORM public.link_billing_customer(v_other, 'cus_refund164');

  ASSERT public.claim_voluntary_refund(v_user, 'sub_refund163a'), 'the first subscription takes the refund';
  SELECT voluntary_refund_at, voluntary_refund_subscription INTO v_at, v_sub FROM public.billing_customers WHERE user_id = v_user;
  ASSERT v_at IS NOT NULL AND v_sub = 'sub_refund163a', format('the refund is recorded on the account: %s %s', v_at, v_sub);

  ASSERT public.claim_voluntary_refund(v_user, 'sub_refund163a'), 'the same subscription may retry';
  ASSERT NOT public.claim_voluntary_refund(v_user, 'sub_refund163b'), 'a second subscription gets no refund';
  ASSERT (SELECT voluntary_refund_subscription FROM public.billing_customers WHERE user_id = v_user) = 'sub_refund163a',
    'the first claim stands';
  ASSERT (SELECT voluntary_refund_at FROM public.billing_customers WHERE user_id = v_user) = v_at, 'and keeps its time';

  -- A new customer for the same account does not reset it.
  PERFORM public.link_billing_customer(v_user, 'cus_refund163new');
  ASSERT NOT public.claim_voluntary_refund(v_user, 'sub_refund163c'), 'relinking the customer starts no new refund';

  -- Another account has its own.
  ASSERT public.claim_voluntary_refund(v_other, 'sub_refund163b'), 'another account takes its own refund';

  BEGIN
    PERFORM public.claim_voluntary_refund(v_user, 'sub bad id');
    ASSERT FALSE, 'a malformed subscription id is refused';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'invalid_refund_claim', SQLERRM;
  END;
END;
$$;
