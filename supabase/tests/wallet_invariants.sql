-- Manual verification script (run in the Supabase SQL editor on a TEST project, never with real money).
-- 1) Conversion
select public.usd_to_isc(2) as two_usd_in_isc,            -- expect 0.0200
       public.isc_to_usd(0.02) as min_withdrawal_in_usd,   -- expect 2.00
       public.usd_to_isc(8) as mission_40pct_of_20usd;     -- expect 0.0800
-- 2) Ledger is append-only (both must raise 'ledger entries are immutable')
-- update public.ledger_entries set amount = amount where false;  -- no rows, so use a real id to test:
-- update public.ledger_entries set amount = 1 where id = (select id from public.ledger_entries limit 1);
-- delete from public.ledger_entries where id = (select id from public.ledger_entries limit 1);
-- 3) Wallet totals must equal ledger sums (expect zero rows)
select w.user_id, w.available, coalesce(a.s, 0) as ledger_available, w.held, coalesce(h.s, 0) as ledger_held
from public.wallet_accounts w
left join (select user_id, sum(amount) s from public.ledger_entries where bucket = 'available' group by 1) a on a.user_id = w.user_id
left join (select user_id, sum(amount) s from public.ledger_entries where bucket = 'held' group by 1) h on h.user_id = w.user_id
where w.available <> coalesce(a.s, 0) or w.held <> coalesce(h.s, 0);
-- 4) No double mission credit (expect zero rows)
select ref_id, count(*) from public.ledger_entries where kind = 'earning' group by 1 having count(*) > 1;
-- 5) No negative balances (expect zero rows)
select * from public.wallet_accounts where available < 0 or held < 0;
