import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {reportBounds,dateInput} from '../lib/commercial';
process.loadEnvFile('.env.local');
const origin='http://127.0.0.1:3000',dir='qa/v8-phase4';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),contexts=await Promise.all([browser.newContext(),browser.newContext()]);
const users=[0,1].map(()=>({email:'prospecto-commercial-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')}));
const clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
const checks:string[]=[],ids:string[]=[],workspaces:string[]=[],errors:string[]=[];let passed=false;
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Database operation failed: '+JSON.stringify(r.error));return r.data as NonNullable<T>;};
async function post(i:number,action:string,extra:Record<string,unknown>={},status=200){const r=await contexts[i].request.post(origin+'/api/command',{headers:{origin},data:{action,workspace_id:workspaces[i],...extra}});const body=await r.json();expect(r.status(),body.error).toBe(status);return body;}
try{
 for(let i=0;i<2;i++){
  const r=await contexts[i].request.post(origin+'/auth/action',{headers:{origin},data:{action:'signup',...users[i]}});expect(r.status()).toBe(200);ids.push(must(await clients[i].auth.signInWithPassword(users[i])).user.id);
  await post(i,'workspace.create',{name:'Isolated commercial QA '+i});workspaces.push(must(await clients[i].from('workspaces').select('id').single()).id);
 }
 const summary=await post(0,'billing.summary');expect(summary.subscription).toBeNull();expect(summary.balance).toEqual({monthly:0,topup:0,reserved:0});expect(summary.invoices).toEqual([]);expect(summary.catalog).toHaveLength(5);expect(summary.catalog.every((p:any)=>p.purchasable===false)).toBe(true);
 checks.push('Actual new tenants have no subscription, credits, invoice or paid activity; catalog is proposal-only');
 await post(0,'billing.checkout',{price_id:'growth-v1'},409);await post(0,'billing.checkout',{price_id:'topup-100-v1'},409);await post(0,'billing.cancel',{},409);
 const webhook=await contexts[0].request.post(origin+'/api/payments/webhook',{data:{status:'settlement',workspace_id:workspaces[0],amount:999000}});expect(webhook.status()).toBe(503);
 expect((await post(0,'billing.summary')).balance).toEqual(summary.balance);
 expect((await clients[0].rpc('apply_verified_settlement',{w:workspaces[0],provider_name:'fake',event_key:'fake',payment_key:'fake',price_id:'growth-v1',amount:999000,paid_at:new Date().toISOString()})).error).toBeTruthy();
 expect((await clients[0].from('commercial_catalog').update({purchasable:true}).eq('id','growth-v1')).error).toBeTruthy();
 expect((await clients[0].rpc('reserve_credits',{w:workspaces[0],job:'fake',rate:'company-unpriced-v1',units:1})).error).toBeTruthy();
 checks.push('Checkout/cancellation unavailable, unsigned webhook cannot mutate billing, client grant/config/reserve paths denied');
 const range=reportBounds(dateInput(new Date(Date.now()-86400000),'Asia/Jakarta'),dateInput(new Date(),'Asia/Jakarta'),'Asia/Jakarta');
 await post(1,'billing.summary',{workspace_id:workspaces[0]},403);await post(1,'reporting.load',{workspace_id:workspaces[0],values:range},403);
 expect((await clients[1].rpc('commercial_summary',{w:workspaces[0]})).error).toBeTruthy();
 for(const table of ['subscriptions','payment_receipts','payment_event_keys','invoices','credit_buckets','credit_reservations','credit_allocations','credit_ledger','outbound_events'])expect(must(await clients[1].from(table).select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 const csrf=await contexts[0].request.post(origin+'/api/command',{headers:{origin:'https://foreign.example'},data:{action:'billing.checkout',workspace_id:workspaces[0],price_id:'growth-v1'}});expect(csrf.status()).toBe(403);
 checks.push('Billing/report RPCs, all new tenant tables and command CSRF enforce isolation');
 await post(0,'product.save',{values:{name:'QA reporting product'}});const product=must(await clients[0].from('products').select('id').single()).id;
 // A real saved reservation, with no provider request or invented completion.
 must(await clients[0].rpc('reserve_research',{w:workspaces[0],p:product,k:'company',q:'Isolated saved request; provider not invoked'}));
 await post(0,'contact.save',{values:{name:'QA reporting contact',email:'reporting-qa@example.com'}});const contact=must(await clients[0].from('contacts').select('id').single()).id;
 const campaign=(await post(0,'campaign.create',{values:{name:'QA reporting draft',contact_ids:[contact]}})).id;
 const analytics=(await post(0,'reporting.load',{values:range})).analytics;expect(analytics.sent).toBe(0);expect(analytics.event_count).toBe(0);expect(analytics.research).toEqual({total:1,completed:0,failed:0});
 await post(0,'reporting.load',{values:{...range,from:range.to,to:range.from}},400);await post(0,'reporting.load',{values:{...range,campaign_id:randomUUID()}},400);
 checks.push('Real saved research usage is counted while outreach stays empty; invalid interval/campaign denied');
 await post(0,'workspace.timezone',{timezone:'Asia/Makassar'});expect((await post(0,'billing.summary')).timezone).toBe('Asia/Makassar');
 const p=await contexts[0].newPage();p.on('pageerror',e=>errors.push(e.message));await p.setViewportSize({width:1440,height:900});await p.goto(origin+'/app');
 async function go(name:string){if(await p.getByRole('button',{name:'Buka navigasi',exact:true}).isVisible())await p.getByRole('button',{name:'Buka navigasi',exact:true}).click();await p.locator('.side-nav').getByRole('button',{name,exact:true}).click();}
 await go('Subscription & Credits');await expect(p.getByRole('heading',{name:'Belum ada langganan aktif',exact:true})).toBeVisible();await expect(p.getByRole('heading',{name:'0 kredit tersedia',exact:true})).toBeVisible();await expect(p.getByRole('button',{name:'Pilih Growth',exact:true})).toBeDisabled();
 expect(await p.locator('.side-bottom').innerText()).not.toContain('Rp');await expect(p.getByText('Belum ada invoice berbayar.',{exact:true})).toBeVisible();
 await p.reload();await go('Subscription & Credits');await expect(p.getByText(/Tanggal ditampilkan dalam Asia\/Makassar/)).toBeVisible();
 checks.push('Billing UI uses server proposal prices, empty balances and workspace timezone; sidebar shows no price after reload');
 for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,700]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(400);await p.screenshot({path:dir+'/billing-'+width+'.png',fullPage:true});
  const overflow=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,80),width:e.getBoundingClientRect().width}))}));await writeFile(dir+'/overflow-billing-'+width+'.json',JSON.stringify(overflow,null,2));expect(overflow.scroll,'Billing overflow '+width).toBeLessThanOrEqual(width);
  await go('Analytics');await expect(p.getByText('Belum ada event pengiriman pada rentang ini. Pengirim belum terhubung.',{exact:true})).toBeVisible();await expect(p.getByText('1 permintaan · 0 selesai · 0 gagal',{exact:true})).toBeVisible();
  await p.getByRole('combobox',{name:'Filter campaign',exact:true}).selectOption(campaign);await p.getByRole('button',{name:'Terapkan',exact:true}).click();await expect(p.getByText('Belum ada event pengiriman pada rentang ini. Pengirim belum terhubung.',{exact:true})).toBeVisible();await p.screenshot({path:dir+'/analytics-'+width+'.png',fullPage:true});
  const scroll=await p.evaluate(()=>document.documentElement.scrollWidth);expect(scroll,'Analytics overflow '+width).toBeLessThanOrEqual(width);await go('Subscription & Credits');
 }
 expect(errors).toEqual([]);checks.push('Date/campaign reporting and billing render at 1440/1024/390/320 without overflow or JS errors');
 passed=true;console.log('PASS: Phase 4 commercial/reporting tenant UI and closed payment boundary');
}finally{
 for(let i=0;i<2;i++)if(workspaces[i]){
  for(const table of ['campaigns','campaign_templates','contacts','companies'])must(await clients[i].from(table).delete().eq('workspace_id',workspaces[i]));
  for(const product of must(await clients[i].from('products').select('id')))await post(i,'product.delete',{id:product.id});
  await contexts[i].request.post(origin+'/auth/action',{headers:{origin},data:{action:'logout'}});await clients[i].auth.signOut({scope:'global'});
 }
 await browser.close();await writeFile(dir+'/results.json',JSON.stringify({passed,checks,errors,userIds:ids,workspaceIds:workspaces,cleanup:'No paid fixtures created. Test content removed and sessions globally signed out; ban QA identities separately.'},null,2));
}
