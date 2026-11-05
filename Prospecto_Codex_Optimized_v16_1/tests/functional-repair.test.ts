import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {launchRecipient,replyEventTypes} from '../lib/outreach-state';
import {restoredWorkspaceName,restoreWorkspace} from '../lib/workspace-backup';
import {officeFixture} from '../lib/documents';
import {matchesICP,type Company,type ICP} from '../lib/prospect';

test('ICP exclusions match saved company facts, case-insensitively, without empty exclusion matches',()=>{
 const co={name:'Excluded Co',domain:'excluded.example.com',industry:'Software',location:'Jakarta',employee_count:10} as Company;
 const icp={industry:'Software',location:'Jakarta',employee_min:null,employee_max:null,exclusions:' ;\n  '} as ICP;
 assert.equal(matchesICP(co,icp),true);
 for(const exclusions of ['EXCLUDED CO','other;excluded.example.com','other\nsoftware','Jakarta'])assert.equal(matchesICP(co,{...icp,exclusions}),false);
 assert.equal(matchesICP(co,{...icp,exclusions:'Other company, Bali'}),true);
});
test('restore validates all required files/references before writing; valid long workspace names round-trip',async()=>{
 const product={id:crypto.randomUUID(),name:'Product'},source={id:crypto.randomUUID(),product_id:product.id,title:'missing.txt',kind:'file',upload_state:'stored'};
 const archive=(records:unknown,name='A'.repeat(160))=>officeFixture({'manifest.json':JSON.stringify({version:1,workspace:{name,timezone:'Asia/Jakarta'},records})});
 const writes:any[]=[];const db={from:(table:string)=>({insert:async(value:unknown)=>{writes.push({table,value});return {data:[],error:null};}})} as any;
 await assert.rejects(restoreWorkspace(db,archive({products:[product],knowledge_sources:[source]}),crypto.randomUUID()),/berkas KMS/);assert.equal(writes.length,0);
 await assert.rejects(restoreWorkspace(db,archive({campaign_audience:[{campaign_id:crypto.randomUUID(),contact_id:crypto.randomUUID()}]}),crypto.randomUUID()),/Referensi/);assert.equal(writes.length,0);
 await assert.rejects(restoreWorkspace(db,archive({products:[product,product]}),crypto.randomUUID()),/duplikat/);assert.equal(writes.length,0);
 const result=await restoreWorkspace(db,archive({}),crypto.randomUUID());assert.equal(result.executionRestored,false);assert.equal(writes[0].value.name.length,160);assert.ok(writes[0].value.name.endsWith(' (restored)'));
 for(const length of [1,140,150,160])assert.ok(restoredWorkspaceName('A'.repeat(length)).length<=160);
});

test('functional repair: frozen senders, reply semantics, membership lifecycle and saved lists',async t=>{
 const db=new PGlite(),A=crypto.randomUUID(),B=crypto.randomUUID(),C=crypto.randomUUID(),D=crypto.randomUUID(),E=crypto.randomUUID(),w=crypto.randomUUID(),foreign=crypto.randomUUID();
 const one=async(sql:string,args:unknown[]=[])=> (await db.query<any>(sql,args)).rows[0];
 const as=async(id:string)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 const trusted=async()=>db.exec('reset role;set role service_role');
 try{
  await db.exec(`create role authenticated nologin;create role anon nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);insert into auth.users values('${A}','owner@example.com',now()),('${B}','admin@example.com',now()),('${C}','member@example.com',now()),('${D}','foreign@example.com',now()),('${E}','other@example.com',now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;grant usage on schema public to authenticated;`);
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
  await as(A);await db.query("insert into workspaces(id,name,created_by) values($1,'Local repair QA',$2)",[w,A]);
  const p=(await one("insert into products(workspace_id,name) values($1,'Product') returning id",[w])).id;
  const contact=(await one("insert into contacts(workspace_id,name,email,verification,source_url) values($1,'Contact','contact@example.com','verified','https://example.com/team') returning id",[w])).id;
  const contact2=(await one("insert into contacts(workspace_id,name,email) values($1,'Other','other-contact@example.com') returning id",[w])).id;
  const c=(await one('select create_campaign($1,$2,$3) id',[w,'Sequence',[contact]])).id;
  await db.query('select save_outreach($1,$2,$3,$4)',[w,c,JSON.stringify({name:'Sequence',product_id:p,sender_name:'Original',steps:[{kind:'email',subject:'Subject',body:'Body',days:1}]}),[contact]]);await db.query('select approve_campaign($1,$2)',[w,c]);
  await as(D);await db.query("insert into workspaces(id,name,created_by) values($1,'Foreign',$2)",[foreign,D]);const foreignContact=(await one("insert into contacts(workspace_id,name,email) values($1,'Foreign','foreign@example.com') returning id",[foreign])).id;
  await db.exec('reset role');await db.query("insert into workspace_memberships(workspace_id,user_id,role) values($1,$2,'admin'),($1,$3,'member'),($1,$4,'member')",[w,B,C,E]);await trusted();
  await db.query('insert into presentation_access(workspace_id,granted_by) values($1,$2)',[w,A]);const connection=(await one("insert into channel_connections(workspace_id,sender_email,sender_name,status,verified_at,created_by) values($1,'original@example.com','Original','verified',now(),$2) returning id",[w,A])).id;
  const launch=(await one('select launch_campaign($1,$2,$3) id',[w,c,A])).id;
  await t.test('reconnecting SMTP cannot change old unsubscribe identity or recipient',async()=>{
   const before=await one('select sender_email,snapshot from campaign_launches where id=$1',[launch]);
   await db.query("update channel_connections set sender_email='replacement@example.com',verified_at=now() where id=$1",[connection]);await as(A);await db.query("update contacts set email='changed@example.com' where id=$1",[contact]);await trusted();
   const frozen=await one('select sender_email,snapshot from campaign_launches where id=$1',[launch]);assert.deepEqual(launchRecipient(frozen,contact),{email:'contact@example.com',senderEmail:'original@example.com'});assert.equal(frozen.sender_email,before.sender_email);
   await assert.rejects(db.query("update campaign_launches set sender_email='replacement@example.com' where id=$1",[launch]),/immutable/);
   assert.throws(()=>launchRecipient({...frozen,sender_email:''},contact));
  });
  await t.test('positive reply counts as reply without fabricating another provider event',async()=>{
   for(const [event_type,provider]of [['sent','local-fixture'],['positive_reply','manual']])await db.query('insert into outbound_events(workspace_id,campaign_id,contact_id,provider,provider_event_id,event_type,occurred_at) values($1,$2,$3,$4,$5,$6,now())',[w,c,contact,provider,event_type,event_type]);
   assert.equal((await one('select count(*)::int n from outbound_events where campaign_id=$1 and event_type=any($2)',[c,[...replyEventTypes]])).n,1);
   await as(A);const report=(await one("select analytics_summary($1,now()-interval '1 day',now()+interval '1 day',null) r",[w])).r;assert.equal(report.replied,1);assert.equal(report.positive_reply,1);assert.equal(report.event_count,2);await trusted();
  });
  const token='cd'.repeat(32),revoked='ef'.repeat(32);
  await db.query("insert into workspace_invites(workspace_id,email,token_hash,created_by) values($1,'member@example.com',encode(sha256(convert_to($2,'UTF8')),'hex'),$3),($1,'other@example.com',encode(sha256(convert_to($4,'UTF8')),'hex'),$3)",[w,token,A,revoked]);
  await t.test('team management never grants ownership or lets admins manage other admins',async()=>{
   await as(C);await db.query('select accept_workspace_invite($1)',[token]);await assert.rejects(db.query('select manage_workspace_member($1,$2,$3)',[w,C,'admin']));
   await as(B);await assert.rejects(db.query('select manage_workspace_member($1,$2,$3)',[w,A,'member']));await assert.rejects(db.query('select manage_workspace_member($1,$2,$3)',[w,E,'admin']));
   await as(A);assert.equal((await one('select workspace_team($1) team',[w])).team.length,4);await assert.rejects(db.query('select manage_workspace_member($1,$2,null)',[w,A]));await assert.rejects(db.query('select manage_workspace_member($1,$2,$3)',[w,E,'owner']));await db.query('select manage_workspace_member($1,$2,$3)',[w,E,'admin']);
   await as(B);await assert.rejects(db.query('select manage_workspace_member($1,$2,null)',[w,E]));
   await as(D);await assert.rejects(db.query('select workspace_team($1)',[w]));await assert.rejects(db.query('select manage_workspace_member($1,$2,null)',[w,C]));
  });
  await t.test('revoked and previously accepted invitations cannot restore removed access',async()=>{
   await as(A);const invite=(await one("select id from workspace_invites where workspace_id=$1 and email='other@example.com'",[w])).id;await db.query('select revoke_workspace_invite($1,$2)',[w,invite]);await as(E);await assert.rejects(db.query('select accept_workspace_invite($1)',[revoked]));
   await as(A);await db.query('select manage_workspace_member($1,$2,null)',[w,C]);await as(C);await assert.rejects(db.query('select accept_workspace_invite($1)',[token]));assert.equal((await one('select count(*)::int n from products where workspace_id=$1',[w])).n,0);
  });
  await t.test('demoting a campaign admin cancels pending work immediately',async()=>{
   await as(B);const campaign=(await one('select create_campaign($1,$2,$3) id',[w,'Role safety',[contact]])).id;
   await db.query('select save_outreach($1,$2,$3,$4)',[w,campaign,JSON.stringify({name:'Role safety',product_id:p,sender_name:'Sender',steps:[{kind:'email',subject:'Local fixture',body:'Local fixture',days:1}]}),[contact]]);await db.query('select approve_campaign($1,$2)',[w,campaign]);await trusted();
   const queued=(await one('select launch_campaign($1,$2,$3) id',[w,campaign,B])).id;await as(A);await db.query("select manage_workspace_member($1,$2,'member')",[w,B]);assert.equal((await one('select state from campaign_launches where id=$1',[queued])).state,'canceled');assert.equal((await one('select state from outbound_jobs where launch_id=$1',[queued])).state,'canceled');
  });
  await t.test('saved list replacement is atomic, tenant-safe, and member deletion remains restricted',async()=>{
   await as(A);const list=(await one('select save_lead_list($1,null,$2,$3) id',[w,'Target shortlist',[contact,contact2]])).id;await db.query('select save_lead_list($1,$2,$3,$4)',[w,list,'Updated',[contact2]]);assert.equal((await one('select count(*)::int n from lead_list_members where list_id=$1',[list])).n,1);
   await assert.rejects(db.query('select save_lead_list($1,$2,$3,$4)',[w,list,'Bad',[foreignContact]]));await assert.rejects(db.query('select save_lead_list($1,$2,$3,$4)',[w,list,'Bad',[contact2,contact2]]));assert.equal((await one('select name from lead_lists where id=$1',[list])).name,'Updated');
   await as(D);assert.equal((await one('select count(*)::int n from lead_lists where workspace_id=$1',[w])).n,0);await assert.rejects(db.query('select save_lead_list($1,$2,$3,$4)',[w,list,'Foreign',[]]));
   await as(A);await db.query("select manage_workspace_member($1,$2,'member')",[w,E]);await as(E);assert.equal((await db.query('delete from lead_lists where id=$1 returning id',[list])).rows.length,0);await as(A);await db.query('delete from lead_lists where id=$1',[list]);assert.equal((await one('select count(*)::int n from lead_list_members where list_id=$1',[list])).n,0);
  });
 }finally{await db.close();}
});
