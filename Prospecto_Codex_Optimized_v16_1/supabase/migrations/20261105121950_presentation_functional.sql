create table public.presentation_access(workspace_id uuid primary key references public.workspaces on delete cascade,granted_by uuid not null references auth.users,expires_at timestamptz not null default now()+interval '30 days',created_at timestamptz not null default now());
create table public.knowledge_documents(
 source_id uuid primary key,workspace_id uuid not null,product_id uuid not null,state text not null check(state in ('indexing','ready','failed')),
 text_content text not null default '' check(length(text_content)<=200000),chunks jsonb not null default '[]' check(jsonb_typeof(chunks)='array' and jsonb_array_length(chunks)<=100),chunk_count int generated always as(jsonb_array_length(chunks)) stored,
 source_fingerprint text not null default '',error_code text not null default '',updated_at timestamptz not null default now(),
 foreign key(workspace_id,source_id) references public.knowledge_sources(workspace_id,id) on delete cascade,foreign key(workspace_id,product_id) references public.products(workspace_id,id) on delete cascade
);
create index documents_product on public.knowledge_documents(workspace_id,product_id);
create index documents_search on public.knowledge_documents using gin(to_tsvector('simple',text_content));
create table public.leo_runs(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,product_id uuid not null,engine text not null check(engine in ('template','openai')),
 instruction text not null check(length(instruction)<=2000),result jsonb not null,source_refs jsonb not null default '[]',created_by uuid not null references auth.users,created_at timestamptz not null default now(),
 foreign key(workspace_id,product_id) references public.products(workspace_id,id) on delete cascade
);
create index leo_product on public.leo_runs(workspace_id,product_id,created_at desc);
create table public.channel_connections(id uuid primary key default gen_random_uuid(),workspace_id uuid not null unique references public.workspaces on delete cascade,sender_email text not null,sender_name text not null,status text not null check(status in ('verified','disconnected')),verified_at timestamptz,created_by uuid not null references auth.users,unique(workspace_id,id));
create table public.smtp_credentials(connection_id uuid primary key references public.channel_connections on delete cascade,ciphertext text not null);
create table public.workspace_invites(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,email text not null,token_hash text not null,created_by uuid not null references auth.users,expires_at timestamptz not null default now()+interval '7 days',accepted_by uuid references auth.users,accepted_at timestamptz,created_at timestamptz not null default now(),unique(workspace_id,email));
create table public.campaign_launches(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,campaign_id uuid not null,connection_id uuid not null,actor_id uuid not null references auth.users,
 state text not null default 'queued' check(state in ('queued','active','paused','canceled','completed','needs_attention')),
 snapshot jsonb not null,snapshot_hash text not null,created_at timestamptz not null default now(),
 unique(workspace_id,id),unique(workspace_id,campaign_id,snapshot_hash),
 foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id) on delete cascade,foreign key(workspace_id,connection_id) references public.channel_connections(workspace_id,id) on delete restrict
);
create index launches_campaign on public.campaign_launches(workspace_id,campaign_id);
create index launches_connection on public.campaign_launches(workspace_id,connection_id);
create table public.outbound_jobs(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,launch_id uuid not null,contact_id uuid not null,step_index integer not null check(step_index between 0 and 11),
 state text not null default 'pending' check(state in ('pending','processing','sent','completed','manual','blocked','canceled','needs_attention')),
 due_at timestamptz not null default now(),started_at timestamptz,finished_at timestamptz,attempts int not null default 0,message_id text not null default '',note text not null default '',
 unique(launch_id,contact_id,step_index),foreign key(workspace_id,launch_id) references public.campaign_launches(workspace_id,id) on delete cascade,foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id) on delete restrict
);
create index jobs_due on public.outbound_jobs(state,due_at);
create index jobs_workspace on public.outbound_jobs(workspace_id,launch_id);
create index jobs_contact on public.outbound_jobs(workspace_id,contact_id);
create table public.smtp_suppressions(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,email text not null,sender_email text not null,reason text not null check(reason in ('unsubscribed','bounce','manual')),created_at timestamptz not null default now(),unique(workspace_id,email,sender_email));
create index suppression_sender on public.smtp_suppressions(sender_email,email);
create table public.provider_usage(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,user_id uuid not null references auth.users,kind text not null check(kind in ('company','pic','kms','leo','invite','smtp_test')),created_at timestamptz not null default now());
create index provider_usage_user on public.provider_usage(user_id,created_at);
create index provider_usage_workspace on public.provider_usage(workspace_id,created_at);
create index provider_usage_time on public.provider_usage(created_at);
create table public.manual_event_notes(event_id uuid primary key references public.outbound_events on delete cascade,workspace_id uuid not null references public.workspaces on delete cascade,note text not null check(length(trim(note)) between 1 and 2000),actor_id uuid not null references auth.users);
create index manual_notes_workspace on public.manual_event_notes(workspace_id);
create table public.operational_events(id uuid primary key default gen_random_uuid(),workspace_id uuid references public.workspaces on delete cascade,kind text not null,error_code text not null default '',created_at timestamptz not null default now());
create index operational_workspace on public.operational_events(workspace_id,created_at desc);
do $$ declare t text;begin
 foreach t in array array['presentation_access','knowledge_documents','leo_runs','channel_connections','smtp_credentials','workspace_invites','campaign_launches','outbound_jobs','smtp_suppressions','provider_usage','manual_event_notes','operational_events'] loop
  execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant all on public.%I to service_role',t);
  if t not in ('smtp_credentials','workspace_invites') then execute format('grant select on public.%I to authenticated',t);execute format('create policy tenant_read on public.%I for select to authenticated using(private.workspace_role(workspace_id) is not null)',t);end if;
 end loop;
end $$;
grant select(id,workspace_id,email,created_by,expires_at,accepted_by,accepted_at,created_at) on public.workspace_invites to authenticated;
create policy invite_read on public.workspace_invites for select to authenticated using(private.workspace_role(workspace_id) in ('owner','admin'));
grant execute on function private.outreach_snapshot(uuid,uuid),private.outreach_content_ready(uuid,uuid) to service_role;
grant select on public.knowledge_sources,public.products,public.contacts,public.companies,public.campaign_audience,public.campaigns,public.campaign_reviews to service_role;
grant update on public.campaigns to service_role;

create function public.search_knowledge(w uuid,p uuid,q text) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from(select d.source_id,s.title,left(d.text_content,2500) excerpt,ts_rank(to_tsvector('simple',d.text_content),plainto_tsquery('simple',left(q,200))) rank from public.knowledge_documents d join public.knowledge_sources s on s.id=d.source_id and s.workspace_id=d.workspace_id where d.workspace_id=w and d.product_id=p and d.state='ready' and (trim(q)='' or to_tsvector('simple',d.text_content)@@plainto_tsquery('simple',left(q,200)) or d.text_content ilike '%'||left(q,200)||'%') order by rank desc,d.updated_at desc limit 5) r
$$;
revoke all on function public.search_knowledge(uuid,uuid,text) from public,anon;grant execute on function public.search_knowledge(uuid,uuid,text) to authenticated,service_role;

create function public.accept_workspace_invite(raw_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare i public.workspace_invites;email_address text;
begin
 if auth.uid() is null or length(raw_token)<>64 then raise exception 'Unauthorized';end if;
 select lower(email) into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into i from public.workspace_invites where token_hash=encode(sha256(convert_to(raw_token,'UTF8')),'hex') and email=email_address and expires_at>now() for update;
 if not found then raise exception 'Invitation expired or email mismatch';end if;
 if i.accepted_by is not null and i.accepted_by<>auth.uid() then raise exception 'Invitation used';end if;
 if not exists(select 1 from public.workspace_memberships where workspace_id=i.workspace_id and user_id=auth.uid()) then insert into public.workspace_memberships(workspace_id,user_id,role) values(i.workspace_id,auth.uid(),'member');end if;
 update public.workspace_invites set accepted_by=auth.uid(),accepted_at=now() where id=i.id;return i.workspace_id;
end $$;
revoke all on function public.accept_workspace_invite(text) from public,anon;grant execute on function public.accept_workspace_invite(text) to authenticated;

create function public.reserve_provider_usage(w uuid,actor uuid,k text) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;begin
 if not exists(select 1 from public.workspace_memberships where workspace_id=w and user_id=actor) then raise exception 'Unauthorized';end if;
 perform pg_advisory_xact_lock(732891);
 if (select count(*) from public.provider_usage where created_at>now()-interval '1 day')>=500 or (select count(*) from public.provider_usage where user_id=actor and created_at>now()-interval '1 day')>=100 or (select count(*) from public.provider_usage where user_id=actor and created_at>now()-interval '1 minute')>=5 then raise exception 'Provider budget reached';end if;
 insert into public.provider_usage(workspace_id,user_id,kind) values(w,actor,k) returning id into result;return result;
end $$;
revoke all on function public.reserve_provider_usage(uuid,uuid,text) from public,anon,authenticated;grant execute on function public.reserve_provider_usage(uuid,uuid,text) to service_role;

create function public.launch_campaign(w uuid,c uuid,actor uuid,start_at timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare snap jsonb;fingerprint text;result uuid;connection uuid;begin
 if not exists(select 1 from public.workspace_memberships where workspace_id=w and user_id=actor and role in ('owner','admin')) then raise exception 'Unauthorized';end if;
 if start_at is not null and (start_at<now() or start_at>now()+interval '30 days') then raise exception 'Invalid sending schedule';end if;
 perform 1 from public.campaigns where workspace_id=w and id=c for update;if not found or not private.outreach_content_ready(w,c) then raise exception 'Campaign not ready';end if;
 snap:=private.outreach_snapshot(w,c);
 if not exists(select 1 from public.campaign_reviews where workspace_id=w and campaign_id=c and snapshot=snap) then raise exception 'Approval required';end if;
 select id into connection from public.channel_connections where workspace_id=w and status='verified';if connection is null then raise exception 'Sender required';end if;
 fingerprint:=encode(sha256(convert_to(snap::text||connection::text||(select verified_at::text from public.channel_connections where id=connection),'UTF8')),'hex');
 insert into public.campaign_launches(workspace_id,campaign_id,connection_id,actor_id,snapshot,snapshot_hash) values(w,c,connection,actor,snap,fingerprint) on conflict(workspace_id,campaign_id,snapshot_hash) do nothing returning id into result;
 if result is null then select id into result from public.campaign_launches where workspace_id=w and campaign_id=c and snapshot_hash=fingerprint;return result;end if;
 insert into public.outbound_jobs(workspace_id,launch_id,contact_id,step_index,due_at) select w,result,contact_id,0,coalesce(start_at,now()) from public.campaign_audience where workspace_id=w and campaign_id=c;return result;
end $$;
revoke all on function public.launch_campaign(uuid,uuid,uuid,timestamptz) from public,anon,authenticated;grant execute on function public.launch_campaign(uuid,uuid,uuid,timestamptz) to service_role;

create function public.claim_outbound(w uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.outbound_jobs;begin
 perform pg_advisory_xact_lock(732892);
 update public.outbound_jobs set state='needs_attention',note='Worker lease expired; inspect SMTP before retrying' where state='processing' and started_at<now()-interval '2 minutes';
 update public.campaign_launches l set state='needs_attention' where state in ('queued','active') and exists(select 1 from public.outbound_jobs pending_job where pending_job.launch_id=l.id and pending_job.state='needs_attention');
 if (select count(*) from public.outbound_jobs where started_at>now()-interval '1 minute')>=5 or (select count(*) from public.outbound_jobs where started_at>now()-interval '1 hour')>=30 or (select count(*) from public.outbound_jobs where started_at>now()-interval '1 day')>=200 then return null;end if;
 select a.* into j from public.outbound_jobs a join public.campaign_launches l on l.id=a.launch_id where a.state='pending' and a.due_at<=now() and l.state in ('queued','active') and (w is null or a.workspace_id=w) order by a.due_at,a.id for update of a skip locked limit 1;
 if not found then return null;end if;
 update public.outbound_jobs set state='processing',started_at=now(),attempts=attempts+1 where id=j.id returning * into j;update public.campaign_launches set state='active' where id=j.launch_id;return to_jsonb(j);
end $$;
revoke all on function public.claim_outbound(uuid) from public,anon,authenticated;grant execute on function public.claim_outbound(uuid) to service_role;

create function public.finish_outbound(job uuid,outcome text,provider_message text default '',next_index int default null,delay_seconds int default 0,job_note text default '') returns void language plpgsql security invoker set search_path='' as $$
declare j public.outbound_jobs;l public.campaign_launches;begin
 select * into j from public.outbound_jobs where id=job for update;if not found then raise exception 'Job not found';end if;
 if j.state not in ('processing','manual') then return;end if;
 select * into l from public.campaign_launches where id=j.launch_id;
 if outcome not in ('sent','completed','manual','blocked','needs_attention') or length(job_note)>1000 then raise exception 'Invalid outcome';end if;
 if outcome='sent' then
  if provider_message='' then raise exception 'Provider acceptance required';end if;
  insert into public.outbound_events(workspace_id,campaign_id,contact_id,provider,provider_event_id,event_type,occurred_at) values(j.workspace_id,l.campaign_id,j.contact_id,'smtp',j.id::text,'sent',now()) on conflict(provider,provider_event_id) do nothing;
 end if;
 update public.outbound_jobs set state=outcome,finished_at=now(),message_id=provider_message,note=job_note where id=job;
 if outcome in ('sent','completed') and next_index is not null and l.state in ('queued','active','paused') then
  if next_index<=j.step_index or next_index>=jsonb_array_length(l.snapshot->'campaign'->'steps') or delay_seconds not between 0 and 31536000 then raise exception 'Invalid next step';end if;
  insert into public.outbound_jobs(workspace_id,launch_id,contact_id,step_index,due_at) values(j.workspace_id,j.launch_id,j.contact_id,next_index,now()+make_interval(secs=>delay_seconds)) on conflict(launch_id,contact_id,step_index) do nothing;
 end if;
 if outcome='needs_attention' then update public.campaign_launches set state='needs_attention' where id=l.id;
 elsif not exists(select 1 from public.outbound_jobs where launch_id=l.id and state in ('pending','processing','manual','needs_attention')) then update public.campaign_launches set state='completed' where id=l.id and state<>'canceled';end if;
end $$;
revoke all on function public.finish_outbound(uuid,text,text,int,int,text) from public,anon,authenticated;grant execute on function public.finish_outbound(uuid,text,text,int,int,text) to service_role;
create function public.worker_campaign_state(w uuid,c uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('snapshot',private.outreach_snapshot(w,c),'ready',private.outreach_content_ready(w,c),'approved',exists(select 1 from public.campaign_reviews where workspace_id=w and campaign_id=c and snapshot=private.outreach_snapshot(w,c)))
$$;
revoke all on function public.worker_campaign_state(uuid,uuid) from public,anon,authenticated;grant execute on function public.worker_campaign_state(uuid,uuid) to service_role;

-- Preserve the prior financial summary; presentation grants are separate, never paid receipts.
alter function public.commercial_summary(uuid) rename to commercial_summary_base;
revoke all on function public.commercial_summary_base(uuid) from public,anon;grant execute on function public.commercial_summary_base(uuid) to authenticated;
create function public.commercial_summary(w uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select public.commercial_summary_base(w)||jsonb_build_object('presentation',(select to_jsonb(a) from public.presentation_access a where workspace_id=w and expires_at>now()))
$$;
revoke all on function public.commercial_summary(uuid) from public,anon;grant execute on function public.commercial_summary(uuid) to authenticated;
-- Uploaded OOXML is validated before private Storage receives it.
update storage.buckets set allowed_mime_types=array['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'] where id='product-kms';
create or replace function public.analytics_summary(w uuid,from_time timestamptz,to_time timestamptz,c uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
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
  'recent_events',coalesce((select jsonb_agg(to_jsonb(e) order by occurred_at desc) from (select id,campaign_id,event_type,occurred_at,provider from events order by occurred_at desc,id limit 20) e),'[]'::jsonb),
  'research',jsonb_build_object('total',(select count(*) from public.research_runs where workspace_id=w and created_at>=from_time and created_at<to_time),'completed',(select count(*) from public.research_runs where workspace_id=w and status='completed' and created_at>=from_time and created_at<to_time),'failed',(select count(*) from public.research_runs where workspace_id=w and status='failed' and created_at>=from_time and created_at<to_time))
 ) into result;return result;
end $$;
