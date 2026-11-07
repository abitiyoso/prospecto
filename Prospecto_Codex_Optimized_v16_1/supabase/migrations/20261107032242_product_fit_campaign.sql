-- Creates a draft only. Existing approval, SMTP and launch boundaries still apply.
create function public.create_campaign_from_pics(w uuid,p uuid,ids uuid[],campaign_name text,draft_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare selected public.pic_candidates; existing public.contacts; audience uuid[]='{}'; contact_id uuid; saved public.campaigns; begin
 if private.workspace_role(w) is null then raise exception 'Unauthorized'; end if;
 if not exists(select 1 from public.products where workspace_id=w and id=p) then raise exception 'Invalid product'; end if;
 if ids is null or cardinality(ids) not between 1 and 1000 or cardinality(ids)<>(select count(distinct i) from unnest(ids) i) then raise exception 'Invalid selected PICs'; end if;
 perform pg_advisory_xact_lock(hashtextextended(draft_id::text,0));
 perform 1 from public.pic_candidates where workspace_id=w and id=any(ids) for update;
 if (select count(*) from public.pic_candidates where workspace_id=w and id=any(ids) and verification='verified' and email<>'' and source_url<>'')<>cardinality(ids) then raise exception 'Selected PICs need verified business emails and sources'; end if;
 if (select count(distinct email) from public.pic_candidates where workspace_id=w and id=any(ids))<>cardinality(ids) then raise exception 'Selected PICs share an email; review identities'; end if;
 for selected in select * from public.pic_candidates where workspace_id=w and id=any(ids) order by id loop
  select * into existing from public.contacts where workspace_id=w and email=selected.email;
  if found and (existing.company_id is distinct from selected.company_id or lower(trim(existing.name))<>lower(trim(selected.name)) or existing.verification<>'verified') then raise exception 'Existing contact identity differs; review Leads first'; end if;
  contact_id:=public.promote_pic(w,selected.id);audience:=array_append(audience,contact_id);
 end loop;
 select * into saved from public.campaigns where workspace_id=w and id=draft_id;
 if found then
  if saved.product_id is distinct from p or saved.name<>campaign_name or (select array_agg(a.contact_id order by a.contact_id) from public.campaign_audience a where a.workspace_id=w and a.campaign_id=draft_id) is distinct from (select array_agg(i order by i) from unnest(audience) i) then raise exception 'Draft request already used for a different selection'; end if;
  return draft_id;
 end if;
 insert into public.campaigns(id,workspace_id,name,product_id,sender_name) values(draft_id,w,campaign_name,p,coalesce((select sender_name from public.channel_connections where workspace_id=w and status='verified' limit 1),''));
 insert into public.campaign_audience(workspace_id,campaign_id,contact_id) select w,draft_id,i from unnest(audience) i;
 return draft_id;
end $$;
revoke all on function public.create_campaign_from_pics(uuid,uuid,uuid[],text,uuid) from public,anon;
grant execute on function public.create_campaign_from_pics(uuid,uuid,uuid[],text,uuid) to authenticated;
