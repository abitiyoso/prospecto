import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
test('commercial engine uses trusted settlement, isolated ledgers and event cohorts',async t=>{
 const db=new PGlite();const A=crypto.randomUUID(),B=crypto.randomUUID(),M=crypto.randomUUID(),w=crypto.randomUUID(),foreign=crypto.randomUUID();
 const one=async(sql:string,args:unknown[]=[])=> (await db.query<any>(sql,args)).rows[0];
 const as=async(id:string)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 const trusted=async()=>{await db.exec('reset role;set role service_role');};
 try{
  await db.exec(`create role authenticated nologin;create role anon nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);insert into auth.users(id) values('${A}'),('${B}'),('${M}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;grant usage on schema public to authenticated;`);
  for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
  await as(A);await db.query("insert into workspaces(id,name,created_by) values($1,'Isolated commercial fixture',$2)",[w,A]);
  await as(B);await db.query("insert into workspaces(id,name,created_by) values($1,'Foreign fixture',$2)",[foreign,B]);
  await as(A);const contacts=[] as string[];
  for(let i=0;i<2;i++)contacts.push((await one('insert into contacts(workspace_id,name,email) values($1,$2,$3) returning id',[w,'QA '+i,'qa'+i+'@example.com'])).id);
  const campaign=(await one('select create_campaign($1,$2,$3) id',[w,'Isolated analytics fixture',contacts])).id;
  await db.query('insert into products(workspace_id,name) values($1,$2)',[w,'QA product']);
  await t.test('new tenant has zero paid state and clients cannot fabricate prices, credits, invoices or events',async()=>{
   const s=(await one('select commercial_summary($1) s',[w])).s;assert.equal(s.subscription,null);assert.deepEqual(s.balance,{monthly:0,topup:0,reserved:0});assert.equal(s.payment_available,false);assert.ok(s.catalog.every((p:any)=>!p.purchasable));
   await assert.rejects(db.query("update commercial_catalog set purchasable=true"));await assert.rejects(db.query('select reserve_credits($1,$2,$3,1)',[w,'fake','company-unpriced-v1']));
   await assert.rejects(db.query("insert into subscriptions(workspace_id,catalog_id,state,period_start,period_end,provider,provider_subscription_id) values($1,'growth-v1','active',now(),now()+interval '1 month','fake','fake')",[w]));
   await assert.rejects(db.query('select apply_verified_settlement($1,$2,$3,$4,$5,$6,now())',[w,'fake','e','p','growth-v1',999000]));
   await assert.rejects(db.query("insert into outbound_events(workspace_id,campaign_id,contact_id,provider,provider_event_id,event_type,occurred_at) values($1,$2,$3,'fake','fake','sent',now())",[w,campaign,contacts[0]]));
  });
  await trusted();
  await t.test('disabled catalog cannot grant paid state; trusted verified settlement is idempotent',async()=>{
   await assert.rejects(db.query("select apply_verified_settlement($1,'qa','paid-cycle','cycle','growth-v1',999000,now(),now()-interval '20 days',now()+interval '10 days','sub')",[w]));
   await db.exec("update commercial_catalog set purchasable=true,products=1,leads=2,seats=2 where kind='subscription';update commercial_catalog set purchasable=true,effective_from=now()-interval '2 days' where kind='topup';update credit_action_rates set enabled=true,credits_per_unit=50 where id='company-unpriced-v1';");
   const sql="select apply_verified_settlement($1,'qa','paid-cycle','cycle','growth-v1',999000,now(),now()-interval '20 days',now()+interval '10 days','sub') id";
   const receipt=(await one(sql,[w])).id;assert.equal((await one(sql,[w])).id,receipt);
   assert.equal((await one("select apply_verified_settlement($1,'qa','paid-cycle-reordered','cycle','growth-v1',999000,now()) id",[w])).id,receipt);
   await assert.rejects(db.query("select apply_verified_settlement($1,'qa','paid-cycle-reordered','different-payment','growth-v1',999000,now(),now()-interval '20 days',now()+interval '10 days','sub')",[w]));
   await assert.rejects(db.query("update commercial_catalog set credits=9999 where id='growth-v1'"));
   assert.equal((await one('select count(*)::int n from invoices where workspace_id=$1',[w])).n,1);
   await assert.rejects(db.query("select apply_verified_settlement($1,'qa','paid-cycle','cycle','growth-v1',1,now(),now()-interval '20 days',now()+interval '10 days','sub')",[w]));
   await assert.rejects(db.query("select apply_verified_settlement($1,'qa','old-cycle','old','growth-v1',999000,now(),now()-interval '1 month',now()+interval '1 day','sub')",[w]));
  });
  await t.test('monthly first then earliest top-up; actual units, releases, refunds and retries are atomic',async()=>{
   await db.query("select apply_verified_settlement($1,'qa','topup-later','topup-later','topup-300-v1',499000,now())",[w]);
   await db.query("select apply_verified_settlement($1,'qa','topup-earlier','topup-earlier','topup-100-v1',199000,now()-interval '1 day')",[w]);
   const r=(await one("select reserve_credits($1,'job-1','company-unpriced-v1',5) id",[w])).id;
   await assert.rejects(db.query("update credit_action_rates set credits_per_unit=100 where id='company-unpriced-v1'"));
   assert.equal((await one("select reserve_credits($1,'job-1','company-unpriced-v1',5) id",[w])).id,r);
   assert.deepEqual((await db.query<any>('select b.kind,b.granted,a.reserved from credit_allocations a join credit_buckets b on b.id=a.bucket_id where a.reservation_id=$1 order by position',[r])).rows,[{kind:'monthly',granted:200,reserved:200},{kind:'topup',granted:100,reserved:50}]);
   await db.query('select settle_credits($1,$2,3)',[w,r]);await db.query('select settle_credits($1,$2,3)',[w,r]);
   assert.equal(Number((await one('select sum(remaining) n from credit_buckets where workspace_id=$1',[w])).n),450);
   await assert.rejects(db.query('select settle_credits($1,$2,4)',[w,r]));
   await db.query('select refund_credits($1,$2)',[w,r]);await db.query('select refund_credits($1,$2)',[w,r]);
   assert.equal(Number((await one('select sum(remaining) n from credit_buckets where workspace_id=$1',[w])).n),600);
   await assert.rejects(db.query('update credit_ledger set delta=999'));await assert.rejects(db.query('delete from credit_ledger'));
  });
  await t.test('overlapping reservations cannot overdraw; failures and zero results release exactly once',async()=>{
   const results=await Promise.allSettled(['parallel-a','parallel-b','parallel-c'].map(job=>db.query<any>('select reserve_credits($1,$2,$3,5) id',[w,job,'company-unpriced-v1'])));
   assert.equal(results.filter(x=>x.status==='fulfilled').length,2);assert.equal(results.filter(x=>x.status==='rejected').length,1);
   assert.ok((await db.query<any>('select remaining from credit_buckets where workspace_id=$1',[w])).rows.every(x=>Number(x.remaining)>=0));
   for(const r of results)if(r.status==='fulfilled'){const id=r.value.rows[0].id;await db.query('select settle_credits($1,$2,0)',[w,id]);await db.query('select settle_credits($1,$2,0)',[w,id]);}
   assert.equal(Number((await one('select sum(remaining) n from credit_buckets where workspace_id=$1',[w])).n),600);
  });
  await t.test('top-ups never bypass product/lead/seat entitlements; dedupe still works at capacity',async()=>{
   await as(A);await assert.rejects(db.query('insert into products(workspace_id,name) values($1,$2)',[w,'Over capacity']));
   await assert.rejects(db.query("insert into contacts(workspace_id,name,email) values($1,'Over','over@example.com')",[w]));
   const report=(await one('select import_contacts($1,$2::jsonb) r',[w,JSON.stringify([{name:'Duplicate','email':'qa0@example.com'}])])).r;assert.equal(report.duplicates,1);
   await db.exec('reset role');await db.query("insert into workspace_memberships values($1,$2,'member')",[w,M]);
   await assert.rejects(db.query("insert into workspace_memberships values($1,$2,'member')",[w,B]));await trusted();
  });
  await t.test('immutable provider events dedupe and date/campaign cohort analytics use persisted facts',async()=>{
   for(const [key,type,contact] of [['sent-1','sent',contacts[0]],['sent-2','sent',contacts[0]],['open-1','opened',contacts[0]],['open-2','opened',contacts[1]],['reply-1','replied',contacts[0]]] as const)await db.query('insert into outbound_events(workspace_id,campaign_id,contact_id,provider,provider_event_id,event_type,occurred_at) values($1,$2,$3,$4,$5,$6,now())',[w,campaign,contact,'qa',key,type]);
   await assert.rejects(db.query("insert into outbound_events(workspace_id,campaign_id,contact_id,provider,provider_event_id,event_type,occurred_at) values($1,$2,$3,'qa','sent-1','sent',now())",[w,campaign,contacts[0]]));
   await assert.rejects(db.query("update outbound_events set event_type='delivered'"));
   await as(A);const s=(await one("select analytics_summary($1,now()-interval '1 day',now()+interval '1 day',$2) s",[w,campaign])).s;assert.equal(s.sent,1);assert.equal(s.opened,1);assert.equal(s.replied,1);assert.equal(s.event_count,5);
   assert.equal((await one("select analytics_summary($1,now()-interval '10 days',now()-interval '1 day') s",[w])).s.event_count,0);
   await assert.rejects(db.query("select analytics_summary($1,now(),now()-interval '1 day')",[w]));
   await as(M);assert.equal((await one('select commercial_summary($1) s',[w])).s.invoices.length,0);
   await as(B);for(const table of ['subscriptions','payment_receipts','invoices','credit_buckets','credit_reservations','credit_allocations','credit_ledger','outbound_events'])assert.equal((await one('select count(*)::int n from '+table+' where workspace_id=$1',[w])).n,0);
   await assert.rejects(db.query('select commercial_summary($1)',[w]));await assert.rejects(db.query("select analytics_summary($1,now()-interval '1 day',now()+interval '1 day')",[w]));await trusted();
  });
  await t.test('expiry and renewal discard old monthly balance; late releases never resurrect expired credits',async()=>{
   const r=(await one("select reserve_credits($1,'expired-job','company-unpriced-v1',5) id",[w])).id;
   await db.query("update credit_buckets set expires_at=now()-interval '1 second',starts_at=now()-interval '2 days' where workspace_id=$1 and kind='monthly'",[w]);
   await db.query('select settle_credits($1,$2,0)',[w,r]);
   await db.query('select expire_credits($1)',[w]);await db.query('select expire_credits($1)',[w]);
   assert.equal(Number((await one("select sum(remaining) n from credit_buckets where workspace_id=$1 and kind='monthly'",[w])).n),0);
   await db.query("update subscriptions set period_end=now()-interval '1 day',period_start=now()-interval '1 month' where workspace_id=$1",[w]);
   await db.query("select apply_verified_settlement($1,'qa','renew','renew','growth-v1',999000,now(),now()-interval '1 hour',now()+interval '30 days','sub')",[w]);
   assert.equal(Number((await one("select sum(remaining) n from credit_buckets where workspace_id=$1 and kind='monthly'",[w])).n),200);
   await db.query("update subscriptions set state='past_due' where workspace_id=$1",[w]);await assert.rejects(db.query("select reserve_credits($1,'past-due','company-unpriced-v1',1)",[w]));
  });
 }finally{await db.close();}
});
