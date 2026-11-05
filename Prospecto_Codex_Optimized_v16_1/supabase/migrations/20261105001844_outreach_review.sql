-- Content approval only. No sending, scheduled or active status is enabled.
create function private.valid_outreach_steps(steps jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;
begin
 if jsonb_typeof(steps) is distinct from 'array' then return false; end if;
 if jsonb_array_length(steps) not between 1 and 12 then return false; end if;
 for s in select value from jsonb_array_elements(steps) loop
  if jsonb_typeof(s) is distinct from 'object' or not (s ?& array['kind','subject','body','days']) then return false; end if;
  if s->>'kind' not in ('email','wait','linkedin_manual') or jsonb_typeof(s->'kind') <> 'string' or jsonb_typeof(s->'subject') <> 'string' or jsonb_typeof(s->'body') <> 'string' or jsonb_typeof(s->'days') <> 'number' then return false; end if;
  if length(s->>'subject')>300 or length(s->>'body')>20000 or (s->>'days') !~ '^[0-9]+$' then return false; end if;
  if (s->>'days')::numeric not between 1 and 365 then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function private.valid_outreach_steps(jsonb) from public,anon;
grant execute on function private.valid_outreach_steps(jsonb) to authenticated;
alter table public.campaigns add column product_id uuid, add column sender_name text not null default '' check(length(sender_name)<=160), add column steps jsonb not null default '[{"kind":"email","subject":"","body":"","days":3}]';
alter table public.campaigns add constraint campaign_product_fk foreign key(workspace_id,product_id) references public.products(workspace_id,id) on delete restrict;
alter table public.campaigns add constraint campaign_steps_valid check(private.valid_outreach_steps(steps));
create index campaigns_product on public.campaigns(workspace_id,product_id);
-- Preserve existing message drafts as the first real sequence step.
alter table public.campaigns disable trigger audit_change;
update public.campaigns set steps=jsonb_build_array(jsonb_build_object('kind','email','subject',subject,'body',body,'days',3)) where subject<>'' or body<>'';
alter table public.campaigns enable trigger audit_change;

create table public.campaign_templates (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),steps jsonb not null check(private.valid_outreach_steps(steps)),created_at timestamptz not null default now()
);
alter table public.campaign_templates enable row level security;
create policy templates_read on public.campaign_templates for select to authenticated using(private.workspace_role(workspace_id) is not null);
create policy templates_insert on public.campaign_templates for insert to authenticated with check(private.workspace_role(workspace_id) is not null);
create policy templates_delete on public.campaign_templates for delete to authenticated using(private.workspace_role(workspace_id) in ('owner','admin'));
grant select,insert,delete on public.campaign_templates to authenticated;
create index templates_workspace on public.campaign_templates(workspace_id);
create trigger audit_change after insert or delete on public.campaign_templates for each row execute function private.audit_change();

-- Current evidence and audience facts are included: edits automatically invalidate approval.
create function private.outreach_snapshot(w uuid,c uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('campaign',to_jsonb(ca),'product',to_jsonb(p),'audience',coalesce((select jsonb_agg(jsonb_build_object('contact',to_jsonb(ct),'company',to_jsonb(co)) order by ct.id) from public.campaign_audience a join public.contacts ct on ct.workspace_id=a.workspace_id and ct.id=a.contact_id left join public.companies co on co.workspace_id=ct.workspace_id and co.id=ct.company_id where a.workspace_id=w and a.campaign_id=c),'[]'::jsonb))
 from public.campaigns ca left join public.products p on p.workspace_id=ca.workspace_id and p.id=ca.product_id where ca.workspace_id=w and ca.id=c
$$;
create function private.outreach_content_ready(w uuid,c uuid) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare ca public.campaigns;ct public.contacts;s jsonb;txt text;has_email boolean:=false;cnt int:=0;
begin
 select * into ca from public.campaigns where workspace_id=w and id=c;
 if not found or ca.product_id is null then return false; end if;
 for ct in select co.* from public.campaign_audience a join public.contacts co on co.workspace_id=a.workspace_id and co.id=a.contact_id where a.workspace_id=w and a.campaign_id=c loop
  cnt:=cnt+1;
  if ct.verification<>'verified' or ct.source_url='' then return false; end if;
  for s in select value from jsonb_array_elements(ca.steps) loop
   if s->>'kind'='wait' then continue; end if;
   if trim(s->>'body')='' then return false; end if;
   if s->>'kind'='email' then has_email:=true; if trim(s->>'subject')='' then return false; end if; end if;
   txt:=(s->>'subject')||E'\n'||(s->>'body');
   if trim(ct.name)<>'' then txt:=regexp_replace(txt,'\{\{\s*first_name\s*\}\}','','g'); end if;
   if trim(coalesce(nullif(ct.company_name,''),(select name from public.companies where workspace_id=w and id=ct.company_id),''))<>'' then txt:=regexp_replace(txt,'\{\{\s*company\s*\}\}','','g'); end if;
   if trim(ca.sender_name)<>'' then txt:=regexp_replace(txt,'\{\{\s*sender_name\s*\}\}','','g'); end if;
   if position('{{' in txt)>0 or position('}}' in txt)>0 then return false; end if;
  end loop;
 end loop;
 return cnt>0 and has_email;
end $$;
revoke all on function private.outreach_snapshot(uuid,uuid),private.outreach_content_ready(uuid,uuid) from public,anon;
grant execute on function private.outreach_snapshot(uuid,uuid),private.outreach_content_ready(uuid,uuid) to authenticated;
create table public.campaign_reviews (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,campaign_id uuid not null,
 reviewer_id uuid not null references auth.users(id),snapshot jsonb not null,created_at timestamptz not null default now(),
 foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id) on delete cascade
);
alter table public.campaign_reviews enable row level security;
create policy review_read on public.campaign_reviews for select to authenticated using(private.workspace_role(workspace_id) is not null);
create policy review_insert on public.campaign_reviews for insert to authenticated with check(private.workspace_role(workspace_id) in ('owner','admin') and reviewer_id=(select auth.uid()) and snapshot=private.outreach_snapshot(workspace_id,campaign_id) and private.outreach_content_ready(workspace_id,campaign_id));
grant select,insert on public.campaign_reviews to authenticated;
create index review_campaign on public.campaign_reviews(workspace_id,campaign_id,created_at desc);
create index review_reviewer on public.campaign_reviews(reviewer_id);
create trigger audit_change after insert on public.campaign_reviews for each row execute function private.audit_change();
create function public.campaign_preflight(w uuid,c uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('content_ready',private.outreach_content_ready(w,c),'approved',exists(select 1 from public.campaign_reviews r where r.workspace_id=w and r.campaign_id=c and r.snapshot=private.outreach_snapshot(w,c)),'sending_available',false)
 where private.workspace_role(w) is not null and exists(select 1 from public.campaigns where workspace_id=w and id=c)
$$;
create function public.approve_campaign(w uuid,c uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 perform 1 from public.campaigns where workspace_id=w and id=c for update;
 if not found or private.workspace_role(w) not in ('owner','admin') then raise exception 'Unauthorized'; end if;
 insert into public.campaign_reviews(workspace_id,campaign_id,reviewer_id,snapshot) values(w,c,auth.uid(),private.outreach_snapshot(w,c)) returning id into result;
 return result;
end $$;
revoke all on function public.campaign_preflight(uuid,uuid),public.approve_campaign(uuid,uuid) from public,anon;
grant execute on function public.campaign_preflight(uuid,uuid),public.approve_campaign(uuid,uuid) to authenticated;

create function public.save_outreach(w uuid,c uuid,v jsonb,ids uuid[]) returns void language plpgsql security invoker set search_path='' as $$
declare old_ids uuid[];
begin
 perform 1 from public.campaigns where workspace_id=w and id=c for update;
 if not found then raise exception 'Unauthorized'; end if;
 if cardinality(ids) not between 1 and 1000 or cardinality(ids)<>(select count(distinct i) from unnest(ids) i) or exists(select 1 from unnest(ids) i where not exists(select 1 from public.contacts co where co.workspace_id=w and co.id=i)) then raise exception 'Invalid audience'; end if;
 update public.campaigns set name=v->>'name',product_id=(v->>'product_id')::uuid,sender_name=v->>'sender_name',steps=v->'steps',subject=coalesce((select s->>'subject' from jsonb_array_elements(v->'steps') s where s->>'kind'='email' limit 1),''),body=coalesce((select s->>'body' from jsonb_array_elements(v->'steps') s where s->>'kind'='email' limit 1),'') where workspace_id=w and id=c;
 select array_agg(contact_id order by contact_id) into old_ids from public.campaign_audience where workspace_id=w and campaign_id=c;
 if old_ids is distinct from (select array_agg(i order by i) from unnest(ids) i) then
  if private.workspace_role(w) not in ('owner','admin') then raise exception 'Audience changes require admin'; end if;
  delete from public.campaign_audience where workspace_id=w and campaign_id=c;
  insert into public.campaign_audience(workspace_id,campaign_id,contact_id) select w,c,i from unnest(ids) i;
 end if;
end $$;
revoke all on function public.save_outreach(uuid,uuid,jsonb,uuid[]) from public,anon;
grant execute on function public.save_outreach(uuid,uuid,jsonb,uuid[]) to authenticated;
