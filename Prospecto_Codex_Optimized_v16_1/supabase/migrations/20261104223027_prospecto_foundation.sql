-- Phase 1 only. No customer fixtures, provider credentials, billing or send capability.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 160),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.workspace_memberships (
 workspace_id uuid not null references public.workspaces on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 role text not null check(role in ('owner','admin','member')), primary key(workspace_id,user_id)
);
create index memberships_user on public.workspace_memberships(user_id);

-- Narrow internal lookup avoids recursive membership RLS. Authorization always uses auth.uid().
create function private.workspace_role(w uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.workspace_memberships where workspace_id=w and user_id=(select auth.uid())
$$;
revoke all on function private.workspace_role(uuid) from public;
grant execute on function private.workspace_role(uuid) to authenticated;
create function private.bootstrap_owner() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.created_by <> auth.uid() then raise exception 'Unauthorized'; end if;
 insert into public.workspace_memberships(workspace_id,user_id,role) values(new.id,auth.uid(),'owner');
 return new;
end $$;
revoke all on function private.bootstrap_owner() from public;
create trigger workspace_owner after insert on public.workspaces for each row execute function private.bootstrap_owner();

create table public.products (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160), category text not null default '' check(length(category)<=120),
 pain_points text not null default '' check(length(pain_points)<=4000), industry text not null default '' check(length(industry)<=500),
 buyer_roles text not null default '' check(length(buyer_roles)<=500), value_proposition text not null default '' check(length(value_proposition)<=4000),
 pricing_context text not null default '' check(length(pricing_context)<=4000), created_at timestamptz not null default now(), unique(workspace_id,id)
);
create table public.knowledge_sources (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 product_id uuid not null, title text not null check(length(trim(title)) between 1 and 200),
 kind text not null check(kind in ('note','url','file')), content text not null default '' check(length(content)<=50000),
 status text not null default 'pending' check(status='pending'), storage_path text unique,
 upload_state text not null default 'stored' check(upload_state in ('uploading','stored','failed')),
 created_at timestamptz not null default now(), unique(workspace_id,id),
 foreign key(workspace_id,product_id) references public.products(workspace_id,id) on delete cascade,
 check((kind='file' and storage_path=workspace_id::text || '/' || product_id::text || '/' || id::text and content='') or (kind<>'file' and storage_path is null and length(trim(content))>0)),
 check(kind<>'url' or content ~ '^https://[^[:space:]]+$')
);
create table public.companies (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 name text not null check(length(name)<=160), domain text not null check(domain=lower(domain) and length(domain) between 1 and 253),
 unique(workspace_id,domain), unique(workspace_id,id)
);
create table public.contacts (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 company_id uuid, company_name text not null default '' check(length(company_name)<=160), name text not null check(length(trim(name)) between 1 and 160),
 email text not null check(email=lower(trim(email)) and length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 title text not null default '' check(length(title)<=160), source_url text not null default '' check(length(source_url)<=2000),
 verification text not null default 'unverified' check(verification in ('unverified','verified')),
 created_at timestamptz not null default now(), unique(workspace_id,email), unique(workspace_id,id),
 foreign key(workspace_id,company_id) references public.companies(workspace_id,id),
 check(source_url='' or source_url ~ '^https://[^[:space:]]+$'), check(verification<>'verified' or source_url<>'')
);
create table public.campaigns (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160), subject text not null default '' check(length(subject)<=300),
 body text not null default '' check(length(body)<=20000), status text not null default 'draft' check(status='draft'),
 created_at timestamptz not null default now(), unique(workspace_id,id)
);
create table public.campaign_audience (
 workspace_id uuid not null, campaign_id uuid not null, contact_id uuid not null, primary key(campaign_id,contact_id),
 foreign key(workspace_id,campaign_id) references public.campaigns(workspace_id,id) on delete cascade,
 foreign key(workspace_id,contact_id) references public.contacts(workspace_id,id) on delete restrict
);
create index audience_contact on public.campaign_audience(workspace_id,contact_id);

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
create policy workspace_read on public.workspaces for select to authenticated using(private.workspace_role(id) is not null);
create policy workspace_create on public.workspaces for insert to authenticated with check(created_by=(select auth.uid()));
create policy workspace_update on public.workspaces for update to authenticated using(private.workspace_role(id) in ('owner','admin')) with check(private.workspace_role(id) in ('owner','admin'));
create policy membership_read on public.workspace_memberships for select to authenticated using(private.workspace_role(workspace_id) is not null);
-- No direct membership writes: invite/team provisioning deliberately unavailable in Phase 1.
grant select,insert on public.workspaces to authenticated;
grant update(name) on public.workspaces to authenticated;
grant select on public.workspace_memberships to authenticated;

do $$ declare t text; begin
 foreach t in array array['products','knowledge_sources','companies','contacts','campaigns','campaign_audience'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create index %I on public.%I(workspace_id)',t || '_workspace_idx',t);
  execute format('create policy tenant_select on public.%I for select to authenticated using(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_insert on public.%I for insert to authenticated with check(private.workspace_role(workspace_id) in (''owner'',''admin'',''member''))',t);
  execute format('create policy tenant_update on public.%I for update to authenticated using(private.workspace_role(workspace_id) in (''owner'',''admin'',''member'')) with check(private.workspace_role(workspace_id) in (''owner'',''admin'',''member''))',t);
  execute format('create policy tenant_delete on public.%I for delete to authenticated using(private.workspace_role(workspace_id) in (''owner'',''admin''))',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
-- Prevent a multi-workspace member moving records between workspaces, even by direct API.
create function private.immutable_workspace() returns trigger language plpgsql set search_path='' as $$
begin
 if new.workspace_id <> old.workspace_id then raise exception 'Workspace is immutable'; end if;
 return new;
end $$;
revoke all on function private.immutable_workspace() from public;
do $$ declare t text; begin
 foreach t in array array['products','knowledge_sources','companies','contacts','campaigns','campaign_audience'] loop
  execute format('create trigger immutable_workspace before update on public.%I for each row execute function private.immutable_workspace()',t);
 end loop;
end $$;

-- Both procedures are SECURITY INVOKER: RLS and composite FKs apply to every row.
create function public.create_campaign(w uuid, campaign_name text, ids uuid[]) returns uuid language plpgsql security invoker set search_path='' as $$
declare c uuid; begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized'; end if;
 if cardinality(ids) is null or cardinality(ids) not between 1 and 1000 or cardinality(ids) <> (select count(distinct i) from unnest(ids) i) then raise exception 'Invalid audience'; end if;
 if (select count(*) from public.contacts where workspace_id=w and id=any(ids)) <> cardinality(ids) then raise exception 'Invalid audience'; end if;
 insert into public.campaigns(workspace_id,name) values(w,campaign_name) returning id into c;
 insert into public.campaign_audience(workspace_id,campaign_id,contact_id) select w,c,i from unnest(ids) i;
 return c;
end $$;
revoke all on function public.create_campaign(uuid,text,uuid[]) from public;
grant execute on function public.create_campaign(uuid,text,uuid[]) to authenticated;

create function public.import_contacts(w uuid, records jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; co uuid; inserted_count int=0; duplicate_count int=0; affected int; begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized'; end if;
 if jsonb_typeof(records) <> 'array' or jsonb_array_length(records)>1000 then raise exception 'Invalid import'; end if;
 for r in select value from jsonb_array_elements(records) loop
  co := null;
  if coalesce(r->>'domain','')<>'' then
   insert into public.companies(workspace_id,name,domain) values(w,coalesce(r->>'company',''),lower(r->>'domain')) on conflict(workspace_id,domain) do nothing;
   select id into co from public.companies where workspace_id=w and domain=lower(r->>'domain');
  end if;
  insert into public.contacts(workspace_id,company_id,company_name,name,email,title,source_url,verification)
   values(w,co,coalesce(r->>'company',''),r->>'name',lower(trim(r->>'email')),coalesce(r->>'title',''),coalesce(r->>'source_url',''),coalesce(r->>'verification','unverified')) on conflict(workspace_id,email) do nothing;
  get diagnostics affected = row_count;
  inserted_count := inserted_count+affected; duplicate_count := duplicate_count+(1-affected);
 end loop;
 return jsonb_build_object('inserted',inserted_count,'duplicates',duplicate_count);
end $$;
revoke all on function public.import_contacts(uuid,jsonb) from public;
grant execute on function public.import_contacts(uuid,jsonb) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('product-kms','product-kms',false,10485760,array['application/pdf','text/plain']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy kms_read on storage.objects for select to authenticated using(
 bucket_id='product-kms' and exists(select 1 from public.knowledge_sources s where s.storage_path=name and private.workspace_role(s.workspace_id) is not null)
);
create policy kms_insert on storage.objects for insert to authenticated with check(
 bucket_id='product-kms' and exists(select 1 from public.knowledge_sources s where s.storage_path=name and s.kind='file' and private.workspace_role(s.workspace_id) is not null)
);
create policy kms_delete on storage.objects for delete to authenticated using(
 bucket_id='product-kms' and exists(select 1 from public.knowledge_sources s where s.storage_path=name and private.workspace_role(s.workspace_id) in ('owner','admin'))
);
-- No upserts, public buckets or unsigned downloads. Delete files before deleting metadata.

-- Append-only audit metadata; deliberately excludes names, emails, notes and file contents.
create table public.audit_events (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.workspaces on delete cascade,
 actor_id uuid references auth.users on delete set null,
 entity text not null, entity_id uuid not null, operation text not null,
 created_at timestamptz not null default now()
);
create index audit_workspace_time on public.audit_events(workspace_id,created_at desc);
alter table public.audit_events enable row level security;
create policy audit_admin_read on public.audit_events for select to authenticated using(private.workspace_role(workspace_id) in ('owner','admin'));
grant select on public.audit_events to authenticated;
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare record_row jsonb; begin
 if auth.uid() is null then raise exception 'Unauthorized audit mutation'; end if;
 record_row := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.audit_events(workspace_id,actor_id,entity,entity_id,operation)
 values((record_row->>'workspace_id')::uuid,auth.uid(),tg_table_name,(record_row->>'id')::uuid,tg_op);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.audit_change() from public;
do $$ declare t text; begin
 foreach t in array array['products','knowledge_sources','companies','contacts','campaigns'] loop
  execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
 end loop;
end $$;
