create table public.research_runs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces on delete cascade,
 product_id uuid not null, kind text not null check(kind in ('company','pic')), query text not null check(length(query) between 1 and 1000),
 status text not null default 'running' check(status in ('running','completed','failed')),
 results jsonb not null default '[]' check(jsonb_typeof(results)='array' and jsonb_array_length(results)<=5),
 error_code text not null default '' check(length(error_code)<=80), created_at timestamptz not null default now(),
 foreign key(workspace_id,product_id) references public.products(workspace_id,id) on delete cascade
);
create index research_workspace_time on public.research_runs(workspace_id,created_at desc);
create index research_product on public.research_runs(workspace_id,product_id);
alter table public.research_runs enable row level security;
create policy research_read on public.research_runs for select to authenticated using(private.workspace_role(workspace_id) is not null);
create policy research_insert on public.research_runs for insert to authenticated with check(private.workspace_role(workspace_id) is not null);
create policy research_update on public.research_runs for update to authenticated using(private.workspace_role(workspace_id) is not null) with check(private.workspace_role(workspace_id) is not null);
grant select on public.research_runs to authenticated;
grant insert(workspace_id,product_id,kind,query) on public.research_runs to authenticated;
grant update(status,results,error_code) on public.research_runs to authenticated;
create trigger immutable_workspace before update on public.research_runs for each row execute function private.immutable_workspace();
create trigger audit_change after insert or update or delete on public.research_runs for each row execute function private.audit_change();
create function public.reserve_research(w uuid,p uuid,k text,q text) returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized'; end if;
 perform pg_advisory_xact_lock(hashtextextended(w::text,0));
 if (select count(*) from public.research_runs where workspace_id=w and created_at>now()-interval '1 minute')>=3 then raise exception 'Research rate limit'; end if;
 insert into public.research_runs(workspace_id,product_id,kind,query) values(w,p,k,q) returning id into result;
 return result;
end $$;
revoke all on function public.reserve_research(uuid,uuid,text,text) from public;
grant execute on function public.reserve_research(uuid,uuid,text,text) to authenticated;
