-- The privileged helper lives outside exposed API schemas; its checks remain mandatory.
alter function public.accept_workspace_invite(text) set schema private;
create function public.accept_workspace_invite(raw_token text) returns uuid language sql security invoker set search_path='' as $$select private.accept_workspace_invite(raw_token)$$;
revoke all on function public.accept_workspace_invite(text) from public,anon;
grant execute on function public.accept_workspace_invite(text) to authenticated;
-- Explicit deny documents the intentionally server-only encrypted credential store.
create policy credentials_server_only on public.smtp_credentials for all to authenticated using(false) with check(false);
