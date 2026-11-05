-- Proposed catalog only. Payment execution is disabled until a merchant adapter is verified.
create table public.commercial_catalog (
 id text primary key,name text not null,kind text not null check(kind in ('subscription','topup')),
 amount_idr bigint not null check(amount_idr>0),credits integer not null check(credits>0),
 seats integer,products integer,leads integer,active_campaigns integer,
 expiry_months integer not null default 12 check(expiry_months between 1 and 60),
 effective_from timestamptz not null default now(),effective_to timestamptz,purchasable boolean not null default false,
 check(effective_to is null or effective_to>effective_from),
 check(kind='topup' or (seats>0 and products>0 and leads>0 and active_campaigns>0))
);
insert into public.commercial_catalog(id,name,kind,amount_idr,credits,seats,products,leads,active_campaigns) values
 ('growth-v1','Growth','subscription',999000,200,3,5,1000,5),('pro-v1','Pro','subscription',1999000,600,8,20,5000,20),
 ('topup-100-v1','100 credits','topup',199000,100,null,null,null,null),('topup-300-v1','300 credits','topup',499000,300,null,null,null,null),('topup-1000-v1','1.000 credits','topup',1499000,1000,null,null,null,null);
create table public.credit_action_rates (
 id text primary key,action text not null check(action in ('company_research','pic_research','verification','leo')),
 unit text not null,credits_per_unit integer check(credits_per_unit>0),max_units integer not null check(max_units between 1 and 1000),
 enabled boolean not null default false,effective_from timestamptz not null default now(),effective_to timestamptz,
 check(not enabled or credits_per_unit is not null),check(effective_to is null or effective_to>effective_from)
);
insert into public.credit_action_rates(id,action,unit,max_units) values
 ('company-unpriced-v1','company_research','sumber berhasil',5),('pic-unpriced-v1','pic_research','sumber berhasil',5),('verification-unpriced-v1','verification','kontak berhasil',1),('leo-unpriced-v1','leo','draft berhasil',1);
create table public.subscriptions (
 workspace_id uuid primary key references public.workspaces on delete cascade,catalog_id text not null references public.commercial_catalog,
 state text not null check(state in ('trial','active','past_due','grace_period','canceled','expired')),
 period_start timestamptz not null,period_end timestamptz not null,grace_end timestamptz,
 cancel_at_period_end boolean not null default false,provider text not null,provider_subscription_id text not null,
 updated_at timestamptz not null default now(),unique(provider,provider_subscription_id),check(period_end>period_start)
);
create index subscriptions_catalog on public.subscriptions(catalog_id);
create table public.payment_receipts (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,
 provider text not null,event_id text not null,payment_id text not null,catalog_id text not null references public.commercial_catalog,
 amount_idr bigint not null check(amount_idr>0),settled_at timestamptz not null,created_at timestamptz not null default now(),
 unique(provider,event_id),unique(provider,payment_id),unique(workspace_id,id)
);
create index receipts_workspace on public.payment_receipts(workspace_id,created_at desc);
create index receipts_catalog on public.payment_receipts(catalog_id);
create table public.payment_event_keys (
 workspace_id uuid not null,provider text not null,event_id text not null,receipt_id uuid not null,
 primary key(provider,event_id),foreign key(workspace_id,receipt_id) references public.payment_receipts(workspace_id,id) on delete cascade
);
create index payment_events_receipt on public.payment_event_keys(workspace_id,receipt_id);
create table public.invoices (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,receipt_id uuid not null unique,
 status text not null check(status in ('paid','refunded')),amount_idr bigint not null check(amount_idr>0),issued_at timestamptz not null,
 foreign key(workspace_id,receipt_id) references public.payment_receipts(workspace_id,id) on delete cascade
);
create index invoices_workspace on public.invoices(workspace_id,issued_at desc);
create table public.credit_buckets (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,receipt_id uuid not null,
 kind text not null check(kind in ('monthly','topup')),granted bigint not null check(granted>0),remaining bigint not null check(remaining between 0 and granted),
 starts_at timestamptz not null,expires_at timestamptz not null,created_at timestamptz not null default now(),
 unique(workspace_id,id),unique(receipt_id),check(expires_at>starts_at),
 foreign key(workspace_id,receipt_id) references public.payment_receipts(workspace_id,id) on delete restrict
);
create index buckets_spend on public.credit_buckets(workspace_id,kind,expires_at);
create table public.credit_reservations (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,
 job_key text not null check(length(job_key) between 1 and 160),rate_id text not null references public.credit_action_rates,
 max_units integer not null check(max_units>0),unit_cost integer not null check(unit_cost>0),reserved bigint not null check(reserved>0),
 actual_units integer,spent bigint not null default 0 check(spent>=0),state text not null default 'reserved' check(state in ('reserved','settled','refunded')),
 created_at timestamptz not null default now(),unique(workspace_id,job_key),unique(workspace_id,id)
);
create index reservations_rate on public.credit_reservations(rate_id);
create table public.credit_allocations (
 workspace_id uuid not null,reservation_id uuid not null,bucket_id uuid not null,position integer not null,
 reserved bigint not null check(reserved>0),spent bigint not null default 0 check(spent between 0 and reserved),primary key(reservation_id,bucket_id),
 foreign key(workspace_id,reservation_id) references public.credit_reservations(workspace_id,id) on delete cascade,
 foreign key(workspace_id,bucket_id) references public.credit_buckets(workspace_id,id) on delete restrict
);
create index allocations_bucket on public.credit_allocations(workspace_id,bucket_id);
create table public.credit_ledger (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,bucket_id uuid not null,reservation_id uuid,
 kind text not null check(kind in ('grant','reserve','settle','release','refund','expire')),delta bigint not null,
 created_at timestamptz not null default now(),
 foreign key(workspace_id,bucket_id) references public.credit_buckets(workspace_id,id) on delete restrict,
 foreign key(workspace_id,reservation_id) references public.credit_reservations(workspace_id,id) on delete restrict
);
create index ledger_workspace on public.credit_ledger(workspace_id,created_at desc);
create index ledger_bucket on public.credit_ledger(workspace_id,bucket_id);
create index ledger_reservation on public.credit_ledger(workspace_id,reservation_id);
create table public.outbound_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,campaign_id uuid not null,contact_id uuid not null,
 provider text not null,provider_event_id text not null,event_type text not null check(event_type in ('sent','delivered','opened','replied','positive_reply','meeting','bounced','unsubscribed')),
 occurred_at timestamptz not null,created_at timestamptz not null default now(),unique(provider,provider_event_id),
 foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id) on delete restrict,
 foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id) on delete restrict,
 foreign key(campaign_id,contact_id) references public.campaign_audience(campaign_id,contact_id) on delete restrict
);
create index events_workspace_time on public.outbound_events(workspace_id,occurred_at);
create index events_campaign on public.outbound_events(workspace_id,campaign_id);
create index events_contact on public.outbound_events(workspace_id,contact_id);
do $$ declare t text;begin
 foreach t in array array['commercial_catalog','credit_action_rates','subscriptions','payment_receipts','payment_event_keys','invoices','credit_buckets','credit_reservations','credit_allocations','credit_ledger','outbound_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
  if t in ('commercial_catalog','credit_action_rates') then
   execute format('create policy catalog_read on public.%I for select to authenticated using(true)',t);
  elsif t in ('payment_receipts','payment_event_keys','invoices') then
   execute format('create policy billing_admin_read on public.%I for select to authenticated using(private.workspace_role(workspace_id) in (''owner'',''admin''))',t);
  else
   execute format('create policy tenant_read on public.%I for select to authenticated using(private.workspace_role(workspace_id) is not null)',t);
  end if;
 end loop;
end $$;
-- Ledger and provider event records are append-only even for trusted application writers.
revoke update,delete on public.credit_ledger,public.payment_receipts,public.payment_event_keys,public.outbound_events from service_role;

create function public.expire_credits(w uuid) returns void language plpgsql security invoker set search_path='' as $$
declare b public.credit_buckets;
begin
 perform pg_advisory_xact_lock(hashtextextended(w::text,71));
 for b in select * from public.credit_buckets where workspace_id=w and expires_at<=now() and remaining>0 for update loop
  update public.credit_buckets set remaining=0 where id=b.id;
  insert into public.credit_ledger(workspace_id,bucket_id,kind,delta) values(w,b.id,'expire',-b.remaining);
 end loop;
end $$;

-- This is a trusted normalized settlement boundary, NOT a public webhook verifier.
create function public.apply_verified_settlement(w uuid,provider_name text,event_key text,payment_key text,price_id text,amount bigint,paid_at timestamptz,cycle_start timestamptz default null,cycle_end timestamptz default null,subscription_key text default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.commercial_catalog;r public.payment_receipts;b uuid;expires timestamptz;prior public.subscriptions;
begin
 perform pg_advisory_xact_lock(hashtextextended(w::text,71));
 select pr.* into r from public.payment_receipts pr where pr.provider=provider_name and (pr.payment_id=payment_key or exists(select 1 from public.payment_event_keys e where e.provider=provider_name and e.event_id=event_key and e.receipt_id=pr.id));
 if found then
  if r.workspace_id<>w or r.catalog_id<>price_id or r.amount_idr<>amount or r.payment_id<>payment_key then raise exception 'Payment replay mismatch'; end if;
  insert into public.payment_event_keys(workspace_id,provider,event_id,receipt_id) values(w,provider_name,event_key,r.id) on conflict(provider,event_id) do nothing;
  return r.id;
 end if;
 select * into p from public.commercial_catalog where id=price_id and purchasable and effective_from<=paid_at and (effective_to is null or effective_to>paid_at);
 if not found or amount<>p.amount_idr or paid_at>now() or length(provider_name) not between 1 and 80 or length(event_key) not between 1 and 160 or length(payment_key) not between 1 and 160 then raise exception 'Unverified or invalid settlement'; end if;
 if p.kind='subscription' then
  if cycle_start is null or cycle_end is null or subscription_key is null or cycle_end<=cycle_start or cycle_end<=now() or cycle_start>now() then raise exception 'Invalid paid cycle'; end if;
  select * into prior from public.subscriptions where workspace_id=w;
  if found and cycle_end<=prior.period_end then raise exception 'Older or duplicate paid cycle'; end if;
  if found and cycle_start<prior.period_end then raise exception 'Overlapping cycle: proration is not configured'; end if;
  update public.credit_buckets set expires_at=greatest(starts_at+interval '1 microsecond',least(expires_at,now())) where workspace_id=w and kind='monthly' and expires_at>now();
  perform public.expire_credits(w);
  insert into public.subscriptions(workspace_id,catalog_id,state,period_start,period_end,provider,provider_subscription_id) values(w,p.id,'active',cycle_start,cycle_end,provider_name,subscription_key)
   on conflict(workspace_id) do update set catalog_id=excluded.catalog_id,state='active',period_start=excluded.period_start,period_end=excluded.period_end,provider=excluded.provider,provider_subscription_id=excluded.provider_subscription_id,cancel_at_period_end=false,grace_end=null,updated_at=now();
  expires:=cycle_end;
 else
  if not exists(select 1 from public.subscriptions where workspace_id=w and state in ('active','grace_period','canceled') and period_end>now()) then raise exception 'Top-up requires a current paid subscription'; end if;
  expires:=paid_at+make_interval(months=>p.expiry_months);
  if expires<=now() then raise exception 'Expired purchase'; end if;
 end if;
 insert into public.payment_receipts(workspace_id,provider,event_id,payment_id,catalog_id,amount_idr,settled_at) values(w,provider_name,event_key,payment_key,p.id,amount,paid_at) returning * into r;
 insert into public.payment_event_keys(workspace_id,provider,event_id,receipt_id) values(w,provider_name,event_key,r.id);
 insert into public.invoices(workspace_id,receipt_id,status,amount_idr,issued_at) values(w,r.id,'paid',amount,paid_at);
 insert into public.credit_buckets(workspace_id,receipt_id,kind,granted,remaining,starts_at,expires_at) values(w,r.id,case when p.kind='subscription' then 'monthly' else 'topup' end,p.credits,p.credits,coalesce(cycle_start,paid_at),expires) returning id into b;
 insert into public.credit_ledger(workspace_id,bucket_id,kind,delta) values(w,b,'grant',p.credits);
 return r.id;
end $$;

create function public.reserve_credits(w uuid,job text,rate text,units integer) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.credit_reservations;v public.credit_action_rates;b public.credit_buckets;needed bigint;take bigint;pos int:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended(w::text,71));
 select * into r from public.credit_reservations where workspace_id=w and job_key=job;
 if found then if r.rate_id<>rate or r.max_units<>units then raise exception 'Job replay mismatch'; end if;return r.id;end if;
 select * into v from public.credit_action_rates where id=rate and enabled and effective_from<=now() and (effective_to is null or effective_to>now());
 if not found or units is null or units not between 1 and v.max_units then raise exception 'Action is unpriced or invalid'; end if;
 if not exists(select 1 from public.subscriptions where workspace_id=w and ((state in ('active','canceled') and period_end>now()) or (state='grace_period' and grace_end>now()))) then raise exception 'Paid entitlement required'; end if;
 perform public.expire_credits(w);needed:=units::bigint*v.credits_per_unit;
 if coalesce((select sum(remaining) from public.credit_buckets where workspace_id=w and starts_at<=now() and expires_at>now()),0)<needed then raise exception 'Insufficient credits'; end if;
 insert into public.credit_reservations(workspace_id,job_key,rate_id,max_units,unit_cost,reserved) values(w,job,rate,units,v.credits_per_unit,needed) returning * into r;
 for b in select * from public.credit_buckets where workspace_id=w and starts_at<=now() and expires_at>now() and remaining>0 order by case when kind='monthly' then 0 else 1 end,expires_at,id for update loop
  take:=least(needed,b.remaining);pos:=pos+1;
  update public.credit_buckets set remaining=remaining-take where id=b.id;
  insert into public.credit_allocations(workspace_id,reservation_id,bucket_id,position,reserved) values(w,r.id,b.id,pos,take);
  insert into public.credit_ledger(workspace_id,bucket_id,reservation_id,kind,delta) values(w,b.id,r.id,'reserve',-take);
  needed:=needed-take;exit when needed=0;
 end loop;
 return r.id;
end $$;

create function public.settle_credits(w uuid,reservation uuid,successful_units integer) returns void language plpgsql security invoker set search_path='' as $$
declare r public.credit_reservations;a public.credit_allocations;needed bigint;used bigint;released bigint;expiry timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended(w::text,71));
 select * into r from public.credit_reservations where workspace_id=w and id=reservation for update;
 if not found then raise exception 'Reservation not found'; end if;
 if r.state<>'reserved' then if r.actual_units is distinct from successful_units then raise exception 'Settlement replay mismatch'; end if;return;end if;
 if successful_units is null or successful_units not between 0 and r.max_units then raise exception 'Invalid actual units'; end if;
 needed:=successful_units::bigint*r.unit_cost;
 for a in select * from public.credit_allocations where workspace_id=w and reservation_id=reservation order by position for update loop
  used:=least(needed,a.reserved);released:=a.reserved-used;needed:=needed-used;
  update public.credit_allocations set spent=used where reservation_id=reservation and bucket_id=a.bucket_id;
  select expires_at into expiry from public.credit_buckets where id=a.bucket_id;
  if released>0 then
   update public.credit_buckets set remaining=remaining+released where id=a.bucket_id and expires_at>now();
   insert into public.credit_ledger(workspace_id,bucket_id,reservation_id,kind,delta) values(w,a.bucket_id,reservation,'release',case when expiry>now() then released else 0 end);
  end if;
  insert into public.credit_ledger(workspace_id,bucket_id,reservation_id,kind,delta) values(w,a.bucket_id,reservation,'settle',0);
 end loop;
 update public.credit_reservations set state='settled',actual_units=successful_units,spent=successful_units::bigint*unit_cost where id=reservation;
end $$;

create function public.refund_credits(w uuid,reservation uuid) returns void language plpgsql security invoker set search_path='' as $$
declare r public.credit_reservations;a public.credit_allocations;expiry timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended(w::text,71));
 select * into r from public.credit_reservations where workspace_id=w and id=reservation for update;
 if not found or r.state='reserved' then raise exception 'Settle or release the job first'; end if;
 if r.state='refunded' then return; end if;
 for a in select * from public.credit_allocations where workspace_id=w and reservation_id=reservation order by position for update loop
  select expires_at into expiry from public.credit_buckets where id=a.bucket_id;
  update public.credit_buckets set remaining=remaining+a.spent where id=a.bucket_id and expires_at>now();
  insert into public.credit_ledger(workspace_id,bucket_id,reservation_id,kind,delta) values(w,a.bucket_id,reservation,'refund',case when expiry>now() then a.spent else 0 end);
 end loop;
 update public.credit_reservations set state='refunded' where id=reservation;
end $$;

revoke all on function public.expire_credits(uuid),public.apply_verified_settlement(uuid,text,text,text,text,bigint,timestamptz,timestamptz,timestamptz,text),public.reserve_credits(uuid,text,text,integer),public.settle_credits(uuid,uuid,integer),public.refund_credits(uuid,uuid) from public,anon,authenticated;
grant execute on function public.expire_credits(uuid),public.apply_verified_settlement(uuid,text,text,text,text,bigint,timestamptz,timestamptz,timestamptz,text),public.reserve_credits(uuid,text,text,integer),public.settle_credits(uuid,uuid,integer),public.refund_credits(uuid,uuid) to service_role;

alter table public.workspaces add column timezone text not null default 'Asia/Jakarta' check(timezone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura'));
create function private.enforce_plan_capacity() returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.commercial_catalog;used bigint;cap integer;w uuid;
begin
 w:=new.workspace_id;perform pg_advisory_xact_lock(hashtextextended(w::text,71));
 select ca.* into p from public.subscriptions s join public.commercial_catalog ca on ca.id=s.catalog_id where s.workspace_id=w and ((s.state in ('active','canceled') and s.period_end>now()) or (s.state='grace_period' and s.grace_end>now()));
 if not found then return new;end if;
 if tg_table_name='products' then cap:=p.products;select count(*) into used from public.products where workspace_id=w;
 elsif tg_table_name='contacts' then
  if exists(select 1 from public.contacts where workspace_id=w and email=new.email) then return new;end if;
  cap:=p.leads;select count(*) into used from public.contacts where workspace_id=w;
 elsif tg_table_name='workspace_memberships' then cap:=p.seats;select count(*) into used from public.workspace_memberships where workspace_id=w;
 else
  if new.status not in ('scheduled','queued','active','paused') or (tg_op='UPDATE' and old.status in ('scheduled','queued','active','paused')) then return new;end if;
  cap:=p.active_campaigns;select count(*) into used from public.campaigns where workspace_id=w and status in ('scheduled','queued','active','paused');
 end if;
 if used>=cap then raise exception 'Plan capacity reached; top-up does not increase capacity';end if;
 return new;
end $$;
revoke all on function private.enforce_plan_capacity() from public,anon;
grant execute on function private.enforce_plan_capacity() to authenticated,service_role;
create trigger plan_capacity before insert on public.products for each row execute function private.enforce_plan_capacity();
create trigger plan_capacity before insert on public.contacts for each row execute function private.enforce_plan_capacity();
create trigger plan_capacity before insert on public.workspace_memberships for each row execute function private.enforce_plan_capacity();
create trigger plan_capacity before insert or update of status on public.campaigns for each row execute function private.enforce_plan_capacity();
grant select on public.products,public.contacts,public.workspace_memberships,public.campaigns to service_role;
grant usage on schema private to service_role;

create function public.commercial_summary(w uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized';end if;
 select jsonb_build_object(
  'timezone',(select timezone from public.workspaces where id=w),'payment_available',false,
  'catalog',coalesce((select jsonb_agg(to_jsonb(c) order by amount_idr) from public.commercial_catalog c where effective_from<=now() and (effective_to is null or effective_to>now())),'[]'::jsonb),
  'rates',coalesce((select jsonb_agg(to_jsonb(r) order by id) from public.credit_action_rates r where effective_from<=now() and (effective_to is null or effective_to>now())),'[]'::jsonb),
  'subscription',(select to_jsonb(s)||jsonb_build_object('plan',(select to_jsonb(ca) from public.commercial_catalog ca where ca.id=s.catalog_id),'display_state',case when s.state in ('active','trial','canceled') and period_end<=now() then 'expired' when s.state='grace_period' and coalesce(grace_end,period_end)<=now() then 'expired' else s.state end) from public.subscriptions s where workspace_id=w),
  'balance',jsonb_build_object('monthly',coalesce((select sum(remaining) from public.credit_buckets where workspace_id=w and kind='monthly' and starts_at<=now() and expires_at>now()),0),'topup',coalesce((select sum(remaining) from public.credit_buckets where workspace_id=w and kind='topup' and starts_at<=now() and expires_at>now()),0),'reserved',coalesce((select sum(reserved) from public.credit_reservations where workspace_id=w and state='reserved'),0)),
  'buckets',coalesce((select jsonb_agg(to_jsonb(b) order by expires_at) from (select id,kind,granted,remaining,starts_at,expires_at from public.credit_buckets where workspace_id=w order by expires_at desc limit 50) b),'[]'::jsonb),
  'ledger',coalesce((select jsonb_agg(to_jsonb(l) order by created_at desc) from (select id,kind,delta,created_at from public.credit_ledger where workspace_id=w order by created_at desc,id limit 50) l),'[]'::jsonb),
  'invoices',coalesce((select jsonb_agg(to_jsonb(i) order by issued_at desc) from (select id,status,amount_idr,issued_at from public.invoices where workspace_id=w order by issued_at desc,id limit 50) i),'[]'::jsonb),
  'counts',jsonb_build_object('products',(select count(*) from public.products where workspace_id=w),'leads',(select count(*) from public.contacts where workspace_id=w),'seats',(select count(*) from public.workspace_memberships where workspace_id=w),'active_campaigns',(select count(*) from public.campaigns where workspace_id=w and status in ('scheduled','queued','active','paused')))
 ) into result;return result;
end $$;

create function public.analytics_summary(w uuid,from_time timestamptz,to_time timestamptz,c uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized';end if;
 if from_time is null or to_time is null or to_time<=from_time or to_time-from_time>interval '366 days' then raise exception 'Invalid reporting interval';end if;
 if c is not null and not exists(select 1 from public.campaigns where workspace_id=w and id=c) then raise exception 'Unauthorized campaign';end if;
 with events as (select * from public.outbound_events where workspace_id=w and occurred_at>=from_time and occurred_at<to_time and (c is null or campaign_id=c)),
 cohort as (select distinct campaign_id,contact_id from events where event_type='sent'),
 cohort_events as (select e.* from events e join cohort co using(campaign_id,contact_id))
 select jsonb_build_object(
  'sent',(select count(*) from cohort),
  'delivered',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='delivered'),
  'opened',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='opened'),
  'replied',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='replied'),
  'positive_reply',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='positive_reply'),
  'meetings',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='meeting'),
  'bounced',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='bounced'),
  'unsubscribed',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='unsubscribed'),
  'event_count',(select count(*) from events),
  'recent_events',coalesce((select jsonb_agg(to_jsonb(e) order by occurred_at desc) from (select id,campaign_id,event_type,occurred_at from events order by occurred_at desc,id limit 20) e),'[]'::jsonb),
  'research',jsonb_build_object('total',(select count(*) from public.research_runs where workspace_id=w and created_at>=from_time and created_at<to_time),'completed',(select count(*) from public.research_runs where workspace_id=w and status='completed' and created_at>=from_time and created_at<to_time),'failed',(select count(*) from public.research_runs where workspace_id=w and status='failed' and created_at>=from_time and created_at<to_time))
 ) into result;return result;
end $$;
revoke all on function public.commercial_summary(uuid),public.analytics_summary(uuid,timestamptz,timestamptz,uuid) from public,anon;
grant execute on function public.commercial_summary(uuid),public.analytics_summary(uuid,timestamptz,timestamptz,uuid) to authenticated;

create function private.freeze_commercial_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='commercial_catalog' then
  if exists(select 1 from public.payment_receipts where catalog_id=old.id) and (to_jsonb(new)-array['purchasable','effective_to']) is distinct from (to_jsonb(old)-array['purchasable','effective_to']) then raise exception 'Create a new price version';end if;
 else
  if exists(select 1 from public.credit_reservations where rate_id=old.id) and (to_jsonb(new)-array['enabled','effective_to']) is distinct from (to_jsonb(old)-array['enabled','effective_to']) then raise exception 'Create a new action rate version';end if;
 end if;
 return new;
end $$;
revoke all on function private.freeze_commercial_version() from public,anon,authenticated;
grant execute on function private.freeze_commercial_version() to service_role;
create trigger freeze_price before update on public.commercial_catalog for each row execute function private.freeze_commercial_version();
create trigger freeze_rate before update on public.credit_action_rates for each row execute function private.freeze_commercial_version();
