-- Billing writes nothing for an account that no longer exists (PROF-4,
-- migration 053). Deleting an account cancels its subscription at Stripe
-- first, and the webhook that follows may arrive after delete_user_data ran:
-- link_billing_customer and upsert_provider_entitlement refuse an id with no
-- auth.users row, so the erased account's billing rows do not come back.

INSERT INTO auth.users (id) VALUES ('bbbbbbbb-0000-4000-8000-000000000166');

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user  CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000166';
  v_ghost CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000167';
BEGIN
  -- An id Auth never had.
  BEGIN
    PERFORM public.link_billing_customer(v_ghost, 'cus_ghost166');
    ASSERT FALSE, 'a customer is never linked to an unknown account';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'unknown_account', SQLERRM;
  END;
  BEGIN
    PERFORM public.upsert_provider_entitlement(v_ghost, 'sub_ghost166', 'active', 'price_m', NOW() + INTERVAL '30 days', FALSE);
    ASSERT FALSE, 'a grant is never written for an unknown account';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'unknown_account', SQLERRM;
  END;
  BEGIN
    PERFORM public.link_billing_customer('not-a-uuid', 'cus_ghost166');
    ASSERT FALSE, 'an id that is no account id is refused the same way';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'unknown_account', SQLERRM;
  END;
  ASSERT NOT EXISTS (SELECT 1 FROM public.billing_customers WHERE user_id = v_ghost OR provider_customer_id = 'cus_ghost166');
  ASSERT NOT EXISTS (SELECT 1 FROM public.entitlement_grants WHERE user_id = v_ghost);

  -- A subscriber, as the webhook wrote them.
  PERFORM public.link_billing_customer(v_user, 'cus_erase166');
  PERFORM public.upsert_provider_entitlement(v_user, 'sub_erase166', 'active', 'price_m', NOW() + INTERVAL '30 days', FALSE);
  ASSERT public.is_premium(v_user);
END;
$$;

-- The account is deleted: its data, then its sign-in identity.
DO $$
BEGIN
  PERFORM public.delete_user_data('bbbbbbbb-0000-4000-8000-000000000166');
END;
$$;
RESET ROLE;
DELETE FROM auth.users WHERE id = 'bbbbbbbb-0000-4000-8000-000000000166';
SET LOCAL ROLE service_role;

-- The customer.subscription.deleted event that the cancellation caused
-- arrives now and is refused; nothing names the account again.
DO $$
DECLARE
  v_user CONSTANT TEXT := 'bbbbbbbb-0000-4000-8000-000000000166';
BEGIN
  BEGIN
    PERFORM public.link_billing_customer(v_user, 'cus_erase166');
    ASSERT FALSE, 'the erased account gets no customer link back';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'unknown_account', SQLERRM;
  END;
  BEGIN
    PERFORM public.upsert_provider_entitlement(v_user, 'sub_erase166', 'canceled', 'price_m', NOW(), FALSE);
    ASSERT FALSE, 'the erased account gets no grant back';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'unknown_account', SQLERRM;
  END;
  ASSERT NOT EXISTS (SELECT 1 FROM public.billing_customers WHERE user_id = v_user), 'no billing_customers row';
  ASSERT NOT EXISTS (SELECT 1 FROM public.entitlement_grants WHERE user_id = v_user), 'no entitlement_grants row';
  ASSERT (public.billing_account(v_user) ->> 'customerId') IS NULL;
END;
$$;
