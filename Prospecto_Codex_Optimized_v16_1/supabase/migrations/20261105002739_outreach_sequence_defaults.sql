alter table public.campaigns alter column steps set default '[{"kind":"email","subject":"Perkenalan untuk {{company}}","body":"Halo {{first_name}},\n\nSaya ingin mendiskusikan kebutuhan tim Anda.\n\nSalam,\n{{sender_name}}","days":3},{"kind":"wait","subject":"","body":"","days":3},{"kind":"linkedin_manual","subject":"","body":"Tinjau profil bisnis dan kirim permintaan koneksi secara manual bila sesuai.","days":3},{"kind":"email","subject":"Menindaklanjuti percakapan","body":"Halo {{first_name}},\n\nApakah Anda bersedia mendiskusikan kebutuhan {{company}}?\n\nSalam,\n{{sender_name}}","days":3}]';

create or replace function private.valid_outreach_steps(steps jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb;n int:=0;target jsonb;
begin
 if jsonb_typeof(steps) is distinct from 'array' then return false; end if;
 if jsonb_array_length(steps) not between 1 and 12 then return false; end if;
 for s in select value from jsonb_array_elements(steps) loop
  n:=n+1;
  if jsonb_typeof(s) is distinct from 'object' or not (s ?& array['kind','subject','body','days']) then return false; end if;
  if s->>'kind' not in ('email','wait','linkedin_manual','condition') or jsonb_typeof(s->'kind') <> 'string' or jsonb_typeof(s->'subject') <> 'string' or jsonb_typeof(s->'body') <> 'string' or jsonb_typeof(s->'days') <> 'number' then return false; end if;
  if length(s->>'subject')>300 or length(s->>'body')>20000 or (s->>'days') !~ '^[0-9]+$' then return false; end if;
  if (s->>'days')::numeric not between 1 and 365 then return false; end if;
  if s->>'kind'='condition' then
   if not(s ?& array['condition','then_step','else_step']) or jsonb_typeof(s->'condition')<>'string' or s->>'condition' not in ('replied','not_replied') then return false; end if;
   for target in select value from jsonb_array_elements(jsonb_build_array(s->'then_step',s->'else_step')) loop
    if target='null'::jsonb then continue; end if;
    if jsonb_typeof(target)<>'number' or target::text !~ '^[0-9]+$' then return false; end if;
    if (target::text)::numeric<=n or (target::text)::numeric>jsonb_array_length(steps) then return false; end if;
   end loop;
  end if;
 end loop;
 return true;
end $$;
-- Conditions are editable definitions; no execution is enabled without delivery/reply events.
create or replace function private.outreach_content_ready(w uuid,c uuid) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare ca public.campaigns;ct public.contacts;s jsonb;txt text;has_email boolean:=false;cnt int:=0;
begin
 select * into ca from public.campaigns where workspace_id=w and id=c;
 if not found or ca.product_id is null then return false; end if;
 for ct in select co.* from public.campaign_audience a join public.contacts co on co.workspace_id=a.workspace_id and co.id=a.contact_id where a.workspace_id=w and a.campaign_id=c loop
  cnt:=cnt+1;
  if ct.verification<>'verified' or ct.source_url='' then return false; end if;
  for s in select value from jsonb_array_elements(ca.steps) loop
   if s->>'kind' in ('wait','condition') then continue; end if;
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

