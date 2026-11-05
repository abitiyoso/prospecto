create index if not exists workspaces_creator_idx on public.workspaces(created_by);
create index if not exists knowledge_product_idx on public.knowledge_sources(workspace_id,product_id);
create index if not exists contacts_company_idx on public.contacts(workspace_id,company_id);
create index if not exists audience_campaign_idx on public.campaign_audience(workspace_id,campaign_id);
create index if not exists audit_actor_idx on public.audit_events(actor_id);
