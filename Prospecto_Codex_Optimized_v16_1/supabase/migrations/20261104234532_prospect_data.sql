alter table public.companies add column industry text not null default '' check(length(industry)<=160),
 add column location text not null default '' check(length(location)<=160),
 add column employee_count integer check(employee_count between 1 and 100000000),
 add column source_url text not null default '' check(source_url='' or source_url ~ '^https://[^[:space:]]+$'),
 add column observed_at timestamptz not null default now();
create table public.icp_profiles (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 product_id uuid not null, industry text not null default '' check(length(industry)<=500),
 location text not null default '' check(length(location)<=500), buyer_roles text not null default '' check(length(buyer_roles)<=500),
 employee_min integer check(employee_min>=1), employee_max integer check(employee_max>=1),
 exclusions text not null default '' check(length(exclusions)<=4000),
 unique(workspace_id,product_id), foreign key(workspace_id,product_id) references public.products(workspace_id,id) on delete cascade,
 check(employee_min is null or employee_max is null or employee_max>=employee_min)
);
create table public.pic_candidates (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 company_id uuid not null, name text not null check(length(trim(name)) between 1 and 160),
 title text not null default '' check(length(title)<=160), email text not null default '' check(email='' or (email=lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 source_url text not null check(source_url ~ '^https://[^[:space:]]+$' and length(source_url)<=2000),
 confidence text not null default 'unassessed' check(confidence in ('unassessed','low','medium','high')),
 verification text not null default 'candidate' check(verification in ('candidate','verified','rejected')),
 observed_at timestamptz not null default now(), notes text not null default '' check(length(notes)<=4000),
 unique(workspace_id,id), foreign key(workspace_id,company_id) references public.companies(workspace_id,id) on delete cascade
);
create index pic_company_idx on public.pic_candidates(workspace_id,company_id);
do $$declare t text; begin
 foreach t in array array['icp_profiles','pic_candidates'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_insert on public.%I for insert to authenticated with check(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_update on public.%I for update to authenticated using(private.workspace_role(workspace_id) is not null) with check(private.workspace_role(workspace_id) is not null)',t);
  execute format('create policy tenant_delete on public.%I for delete to authenticated using(private.workspace_role(workspace_id) in (''owner'',''admin''))',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create trigger immutable_workspace before update on public.%I for each row execute function private.immutable_workspace()',t);
  execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',t);
 end loop;
end $$;
create function public.promote_pic(w uuid,pic uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.pic_candidates; co public.companies; result uuid; begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized'; end if;
 select * into p from public.pic_candidates where workspace_id=w and id=pic;
 if not found or p.verification<>'verified' or p.email='' then raise exception 'Verified candidate and business email required'; end if;
 select * into co from public.companies where workspace_id=w and id=p.company_id;
 insert into public.contacts(workspace_id,company_id,company_name,name,email,title,source_url,verification)
 values(w,co.id,co.name,p.name,p.email,p.title,p.source_url,'verified') on conflict(workspace_id,email) do nothing;
 select id into result from public.contacts where workspace_id=w and email=p.email;
 return result;
end $$;
revoke all on function public.promote_pic(uuid,uuid) from public;
grant execute on function public.promote_pic(uuid,uuid) to authenticated;
