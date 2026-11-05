-- Admin-only verification. All fixture writes MUST remain inside this rollback.
begin;
do $$
declare u uuid;w uuid:=gen_random_uuid();receipt uuid;reservation uuid;marker text:=gen_random_uuid()::text;summary jsonb;denied boolean:=false;
begin
 select id into u from auth.users where email like 'prospecto-commercial-%@example.com' order by created_at desc limit 1;
 if u is null then raise exception 'An isolated commercial QA identity is required';end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated';
 insert into public.workspaces(id,name,created_by) values(w,'Rolled-back commercial engine fixture',u);
 execute 'set local role service_role';
 update public.commercial_catalog set purchasable=true where id='growth-v1';
 update public.credit_action_rates set enabled=true,credits_per_unit=5 where id='company-unpriced-v1';
 receipt:=public.apply_verified_settlement(w,'isolated-qa',marker,marker,'growth-v1',999000,now(),now()-interval '1 hour',now()+interval '1 month',marker);
 if receipt<>public.apply_verified_settlement(w,'isolated-qa',marker,marker,'growth-v1',999000,now()) then raise exception 'Receipt retry mismatch';end if;
 reservation:=public.reserve_credits(w,'isolated-job','company-unpriced-v1',2);
 perform public.settle_credits(w,reservation,1);
 perform public.settle_credits(w,reservation,1);
 if (select sum(remaining) from public.credit_buckets where workspace_id=w)<>195 then raise exception 'Settlement balance mismatch';end if;
 perform public.refund_credits(w,reservation);
 perform public.refund_credits(w,reservation);
 if (select sum(remaining) from public.credit_buckets where workspace_id=w)<>200 then raise exception 'Refund balance mismatch';end if;
 execute 'set local role authenticated';
 summary:=public.commercial_summary(w);
 if summary->'balance'->>'monthly'<>'200' then raise exception 'Authenticated summary mismatch';end if;
 begin perform public.reserve_credits(w,'unauthorized','company-unpriced-v1',1);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Authenticated customer could invoke trusted billing';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: hosted PostgreSQL settlement/reserve/settle/refund/RLS checked; all fixtures rolled back' as verification;
