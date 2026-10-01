-- A Stripe event is processed once. record_billing_event answers TRUE to the
-- first delivery, FALSE to a second one while the first holds its 60-second
-- lease, TRUE again once the lease is over or the first delivery handed the
-- event back (release_billing_event), and FALSE for good once it is finished.

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_row public.billing_events%ROWTYPE;
BEGIN
  ASSERT public.record_billing_event('evt_once162', 'invoice.paid', 'in_once162'), 'the first delivery processes the event';
  ASSERT NOT public.record_billing_event('evt_once162', 'invoice.paid', 'in_once162'), 'a second delivery during the lease stops';
  SELECT * INTO v_row FROM public.billing_events WHERE id = 'evt_once162';
  ASSERT v_row.attempts = 1 AND v_row.processed_at IS NULL AND v_row.type = 'invoice.paid' AND v_row.object_id = 'in_once162',
    format('one attempt recorded: %s', row_to_json(v_row));

  -- The first delivery failed part-way and handed the event back.
  ASSERT public.release_billing_event('evt_once162', 'api_error'), 'the event is handed back';
  SELECT * INTO v_row FROM public.billing_events WHERE id = 'evt_once162';
  ASSERT v_row.attempted_at IS NULL AND v_row.error = 'api_error', format('the reason stays for the operator: %s', row_to_json(v_row));
  ASSERT public.record_billing_event('evt_once162', 'invoice.paid', 'in_once162'), 'the retry takes it at once';
  ASSERT (SELECT attempts FROM public.billing_events WHERE id = 'evt_once162') = 2, 'two attempts';

  -- A delivery that died without handing it back: the lease runs out.
  UPDATE public.billing_events SET attempted_at = NOW() - INTERVAL '61 seconds' WHERE id = 'evt_once162';
  ASSERT public.record_billing_event('evt_once162', 'invoice.paid', 'in_once162'), 'an expired lease lets the retry in';
  ASSERT (SELECT attempts FROM public.billing_events WHERE id = 'evt_once162') = 3, 'three attempts';

  -- Finished: every later delivery stops, and a release changes nothing.
  ASSERT public.finish_billing_event('evt_once162', NULL), 'the event is finished';
  ASSERT NOT public.record_billing_event('evt_once162', 'invoice.paid', 'in_once162'), 'a finished event is never processed again';
  UPDATE public.billing_events SET attempted_at = NOW() - INTERVAL '1 day' WHERE id = 'evt_once162';
  ASSERT NOT public.record_billing_event('evt_once162', 'invoice.paid', 'in_once162'), 'not even long after';
  ASSERT NOT public.release_billing_event('evt_once162', 'late'), 'a finished event cannot be handed back';
  SELECT * INTO v_row FROM public.billing_events WHERE id = 'evt_once162';
  ASSERT v_row.processed_at IS NOT NULL AND v_row.error IS NULL AND v_row.attempts = 3, format('finished cleanly: %s', row_to_json(v_row));

  -- An event that cannot be applied is finished with its reason.
  ASSERT public.record_billing_event('evt_once162b', 'charge.refunded', 'ch_once162');
  ASSERT public.finish_billing_event('evt_once162b', 'not_devshark_price: sub_other');
  ASSERT (SELECT error FROM public.billing_events WHERE id = 'evt_once162b') = 'not_devshark_price: sub_other';
  ASSERT NOT public.record_billing_event('evt_once162b', 'charge.refunded', 'ch_once162');

  -- Unknown events: nothing to finish or release.
  ASSERT NOT public.finish_billing_event('evt_never162', NULL);
  ASSERT NOT public.release_billing_event('evt_never162', NULL);
END;
$$;
