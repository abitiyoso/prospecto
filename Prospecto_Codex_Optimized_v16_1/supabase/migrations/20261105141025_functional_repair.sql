-- Preserve the sender used by each launch, including after reconnecting SMTP.
alter table public.campaign_launches add column sender_email text not null default '',add column sender_name text not null default '',add column sender_verified_at timestamptz;
update public.campaign_launches l set sender_email=lower(c.sender_email),sender_name=c.sender_name,sender_verified_at=c.verified_at from public.channel_connections c where c.id=l.connection_id and c.verified_at<=l.created_at;
create function private.freeze_launch_sender() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if (new.sender_email,new.sender_name,new.sender_verified_at) is distinct from (old.sender_email,old.sender_name,old.sender_verified_at) then raise exception 'Launch sender is immutable';end if;
 else
  select lower(c.sender_email),c.sender_name,c.verified_at into new.sender_email,new.sender_name,new.sender_verified_at from public.channel_connections c where c.id=new.connection_id and c.workspace_id=new.workspace_id and c.status='verified';
  if not found then raise exception 'Verified sender required';end if;
 end if;return new;
end $$;
revoke all on function private.freeze_launch_sender() from public,anon,authenticated;
create trigger freeze_launch_sender before insert or update on public.campaign_launches for each row execute function private.freeze_launch_sender();

alter table public.workspace_invites add column revoked_at timestamptz;
grant select(revoked_at) on public.workspace_invites to authenticated;
create or replace function private.accept_workspace_invite(raw_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare i public.workspace_invites;email_address text;workspace uuid;
begin
 if auth.uid() is null or raw_token !~ '^[a-f0-9]{64}$' then raise exception 'Unauthorized';end if;
 select lower(email) into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select workspace_id into workspace from public.workspace_invites where token_hash=encode(sha256(convert_to(raw_token,'UTF8')),'hex') and email=email_address;
 if workspace is null then raise exception 'Invitation invalid';end if;
 perform 1 from public.workspaces where id=workspace for update;
 select * into i from public.workspace_invites where workspace_id=workspace and token_hash=encode(sha256(convert_to(raw_token,'UTF8')),'hex') and email=email_address and revoked_at is null and expires_at>now() for update;
 if not found then raise exception 'Invitation expired or revoked';end if;
 if i.accepted_by is not null and i.accepted_by<>auth.uid() then raise exception 'Invitation used';end if;
 if not exists(select 1 from public.workspace_memberships where workspace_id=i.workspace_id and user_id=auth.uid()) then insert into public.workspace_memberships(workspace_id,user_id,role) values(i.workspace_id,auth.uid(),'member');end if;
 update public.workspace_invites set accepted_by=auth.uid(),accepted_at=now() where id=i.id;return i.workspace_id;
end $$;

create function private.workspace_team(w uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'email',u.email) order by m.role,u.email) from public.workspace_memberships m join auth.users u on u.id=m.user_id where m.workspace_id=w),'[]'::jsonb);
end $$;
create function private.manage_workspace_member(w uuid,target uuid,new_role text default null) returns void language plpgsql security definer set search_path='' as $$
declare actor_role text;target_role text;email_address text;
begin
 if auth.uid() is null then raise exception 'Unauthorized';end if;
 perform 1 from public.workspaces where id=w for update;
 actor_role:=private.workspace_role(w);
 select role into target_role from public.workspace_memberships where workspace_id=w and user_id=target for update;
 if actor_role is null or target_role is null or target_role='owner' then raise exception 'Owner cannot be removed or changed';end if;
 if new_role is not null then
  if actor_role<>'owner' or new_role not in ('admin','member') then raise exception 'Only owner may change roles';end if;
  update public.workspace_memberships set role=new_role where workspace_id=w and user_id=target;
 else
  if target<>auth.uid() and not(actor_role='owner' or (actor_role='admin' and target_role='member')) then raise exception 'Unauthorized member removal';end if;
  select lower(email) into email_address from auth.users where id=target;
  update public.workspace_invites set revoked_at=now() where workspace_id=w and (accepted_by=target or email=email_address);
  delete from public.workspace_memberships where workspace_id=w and user_id=target;
 end if;
 if new_role is null or new_role='member' then
  update public.campaign_launches set state='canceled' where workspace_id=w and actor_id=target and state in ('queued','active','paused');
  update public.outbound_jobs j set state='canceled',note='Akses pengelola campaign dicabut' from public.campaign_launches l where j.launch_id=l.id and l.workspace_id=w and l.actor_id=target and l.state='canceled' and j.state in ('pending','manual');
 end if;
 insert into public.audit_events(workspace_id,actor_id,entity,entity_id,operation) values(w,auth.uid(),'workspace_memberships',target,case when new_role is null then 'DELETE' else 'UPDATE' end);
end $$;
create function private.revoke_workspace_invite(w uuid,invitation uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.workspaces where id=w for update;
 if coalesce(private.workspace_role(w),'') not in ('owner','admin') then raise exception 'Unauthorized';end if;
 update public.workspace_invites set revoked_at=now() where workspace_id=w and id=invitation and accepted_at is null;
 if not found then raise exception 'Pending invitation not found';end if;
 insert into public.audit_events(workspace_id,actor_id,entity,entity_id,operation) values(w,auth.uid(),'workspace_invites',invitation,'REVOKE');
end $$;
create function public.workspace_team(w uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.workspace_team(w)$$;
create function public.manage_workspace_member(w uuid,target uuid,new_role text default null) returns void language sql security invoker set search_path='' as $$select private.manage_workspace_member(w,target,new_role)$$;
create function public.revoke_workspace_invite(w uuid,invitation uuid) returns void language sql security invoker set search_path='' as $$select private.revoke_workspace_invite(w,invitation)$$;
revoke all on function private.workspace_team(uuid),private.manage_workspace_member(uuid,uuid,text),private.revoke_workspace_invite(uuid,uuid),public.workspace_team(uuid),public.manage_workspace_member(uuid,uuid,text),public.revoke_workspace_invite(uuid,uuid) from public,anon;
grant execute on function private.workspace_team(uuid),private.manage_workspace_member(uuid,uuid,text),private.revoke_workspace_invite(uuid,uuid),public.workspace_team(uuid),public.manage_workspace_member(uuid,uuid,text),public.revoke_workspace_invite(uuid,uuid) to authenticated;

create table public.lead_lists(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,name text not null check(length(trim(name)) between 1 and 160),created_by uuid not null references auth.users,created_at timestamptz not null default now(),unique(workspace_id,id));
create index lead_lists_workspace on public.lead_lists(workspace_id,created_at);
create table public.lead_list_members(workspace_id uuid not null,list_id uuid not null,contact_id uuid not null,primary key(workspace_id,list_id,contact_id),foreign key(workspace_id,list_id) references public.lead_lists(workspace_id,id) on delete cascade,foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id) on delete cascade);
create index lead_list_contacts on public.lead_list_members(workspace_id,contact_id);
alter table public.lead_lists enable row level security;
alter table public.lead_list_members enable row level security;
grant select,insert,delete on public.lead_lists to authenticated;grant update(name) on public.lead_lists to authenticated;
grant select,insert,delete on public.lead_list_members to authenticated;
grant all on public.lead_lists,public.lead_list_members to service_role;
create policy lists_read on public.lead_lists for select to authenticated using(private.workspace_role(workspace_id) is not null);
create policy lists_insert on public.lead_lists for insert to authenticated with check(private.workspace_role(workspace_id) is not null and created_by=(select auth.uid()));
create policy lists_update on public.lead_lists for update to authenticated using(private.workspace_role(workspace_id) is not null) with check(private.workspace_role(workspace_id) is not null);
create policy lists_delete on public.lead_lists for delete to authenticated using(private.workspace_role(workspace_id) in ('owner','admin'));
create policy list_members_read on public.lead_list_members for select to authenticated using(private.workspace_role(workspace_id) is not null);
create policy list_members_insert on public.lead_list_members for insert to authenticated with check(private.workspace_role(workspace_id) is not null);
create policy list_members_delete on public.lead_list_members for delete to authenticated using(private.workspace_role(workspace_id) is not null);
create trigger immutable_workspace before update on public.lead_lists for each row execute function private.immutable_workspace();
create trigger audit_change after insert or update or delete on public.lead_lists for each row execute function private.audit_change();
create function public.save_lead_list(w uuid,list_id uuid,list_name text,ids uuid[]) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;begin
 if private.workspace_role(w) is null or list_name is null or length(trim(list_name)) not between 1 and 160 or ids is null or cardinality(ids)>5000 then raise exception 'Invalid list';end if;
 if cardinality(ids)<>(select count(distinct id) from unnest(ids) id) or cardinality(ids)<>(select count(*) from public.contacts where workspace_id=w and id=any(ids)) then raise exception 'Invalid list contacts';end if;
 if list_id is null then insert into public.lead_lists(workspace_id,name,created_by) values(w,trim(list_name),auth.uid()) returning id into result;
 else perform 1 from public.lead_lists where workspace_id=w and id=list_id for update;if not found then raise exception 'List not found';end if;update public.lead_lists set name=trim(list_name) where workspace_id=w and id=list_id;result:=list_id;end if;
 delete from public.lead_list_members where workspace_id=w and lead_list_members.list_id=result;
 insert into public.lead_list_members(workspace_id,list_id,contact_id) select w,result,id from unnest(ids) id;return result;
end $$;
revoke all on function public.save_lead_list(uuid,uuid,text,uuid[]) from public,anon;grant execute on function public.save_lead_list(uuid,uuid,text,uuid[]) to authenticated;

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
  'replied',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type in ('replied','positive_reply')),
  'positive_reply',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='positive_reply'),
  'meetings',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='meeting'),
  'bounced',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='bounced'),
  'unsubscribed',(select count(distinct (campaign_id,contact_id)) from cohort_events where event_type='unsubscribed'),
  'event_count',(select count(*) from events),
  'recent_events',coalesce((select jsonb_agg(to_jsonb(e) order by occurred_at desc) from (select id,campaign_id,event_type,occurred_at,provider from events order by occurred_at desc,id limit 20) e),'[]'::jsonb),
  'research',jsonb_build_object('total',(select count(*) from public.research_runs where workspace_id=w and created_at>=from_time and created_at<to_time),'completed',(select count(*) from public.research_runs where workspace_id=w and status='completed' and created_at>=from_time and created_at<to_time),'failed',(select count(*) from public.research_runs where workspace_id=w and status='failed' and created_at>=from_time and created_at<to_time))
 ) into result;return result;
end $$;
