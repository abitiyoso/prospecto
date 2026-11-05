import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {defaultSteps} from '../lib/outreach';
process.loadEnvFile('.env.local');
const origin='http://127.0.0.1:3000',dir='qa/v8-phase3';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
const users=[0,1].map(()=>({email:'prospecto-outreach-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')}));
const clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
const checks:string[]=[],ids:string[]=[],workspaces:string[]=[],errors:string[]=[];let passed=false;
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Database operation failed: '+JSON.stringify(r.error));return r.data as NonNullable<T>;};
async function post(i:number,action:string,extra:Record<string,unknown>={},status=200){const r=await contexts[i].request.post(origin+'/api/command',{headers:{origin},data:{action,workspace_id:workspaces[i],...extra}});const body=await r.json();expect(r.status(),body.error).toBe(status);return body;}
try{
 for(let i=0;i<2;i++){
  const r=await contexts[i].request.post(origin+'/auth/action',{headers:{origin},data:{action:'signup',...users[i]}});expect(r.status()).toBe(200);
  ids.push(must(await clients[i].auth.signInWithPassword(users[i])).user.id);
  await post(i,'workspace.create',{name:'Isolated outreach QA '+i});workspaces.push(must(await clients[i].from('workspaces').select('id').single()).id);
 }
 expect(must(await clients[1].from('campaigns').select('*'))).toEqual([]);checks.push('New tenant starts empty with real auth sessions');
 await post(0,'product.save',{values:{name:'Outreach QA product',value_proposition:'Recorded QA context'}});
 const product=must(await clients[0].from('products').select('id').single()).id;
 await post(0,'contact.save',{values:{name:'Budi QA',email:'outreach-qa@example.com',company:'QA Company',verification:'verified',source_url:'https://example.com/team'}});
 const contact=must(await clients[0].from('contacts').select('id').single()).id;
 const campaign=(await post(0,'campaign.create',{values:{name:'QA campaign',contact_ids:[contact]}})).id;
 const values={name:'QA campaign',product_id:product,sender_name:'Ani QA',steps:structuredClone(defaultSteps)};
 await post(0,'campaign.save',{id:campaign,values,contact_ids:[contact]});
 await post(0,'template.save',{values:{name:'QA reusable sequence',steps:values.steps}});
 expect(must(await clients[0].from('campaigns').select('steps,campaign_audience(contact_id)').eq('id',campaign).single()).steps).toHaveLength(4);
 checks.push('Four-step sequence, selected audience and custom template persist');
 const badOrigin=await contexts[0].request.post(origin+'/api/command',{headers:{origin:'https://foreign.example'},data:{action:'campaign.approve',workspace_id:workspaces[0],id:campaign}});expect(badOrigin.status()).toBe(403);
 await post(1,'campaign.approve',{workspace_id:workspaces[0],id:campaign},403);
 await post(1,'campaign.approve',{id:campaign},400);
 for(const table of ['campaigns','campaign_templates','campaign_reviews'])expect(must(await clients[1].from(table).select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 expect((await clients[1].rpc('approve_campaign',{w:workspaces[0],c:campaign})).error).toBeTruthy();
 checks.push('CSRF, API and direct database cross-tenant access denied');
 await post(0,'campaign.approve',{id:campaign});expect((await post(0,'campaign.preflight',{id:campaign})).approved).toBe(true);
 await post(0,'campaign.launch',{id:campaign},409);await post(0,'campaign.leo',{id:campaign},409);
 expect(must(await clients[0].from('campaigns').select('status').eq('id',campaign).single()).status).toBe('draft');
 checks.push('Approval persists but launch and LEO are honestly unavailable; no campaign activation');
 const p=await contexts[0].newPage();p.on('pageerror',e=>errors.push(e.message));await p.setViewportSize({width:1440,height:900});await p.goto(origin+'/app');
 await p.locator('.side-nav').getByRole('button',{name:/Campaigns/}).click();await p.getByRole('button',{name:/QA campaign.*Buka campaign/}).click();
 await expect(p.getByRole('heading',{name:'Preview personalisasi'})).toBeVisible();await expect(p.getByText('Konten disetujui',{exact:true})).toBeVisible();
 await expect(p.getByText('1. Perkenalan untuk QA Company',{exact:true})).toBeVisible();
 await p.getByLabel('Subject langkah 1',{exact:true}).fill('Edited intro for {{company}}');await p.getByRole('tab',{name:'3. Review'}).click();await expect(p.getByRole('button',{name:'Setujui konten'})).toBeDisabled();
 await p.getByRole('tab',{name:'1. Message'}).click();await p.getByRole('button',{name:'Simpan draft',exact:true}).click();await expect(p.getByText('Draft tersimpan. Tidak ada pesan dikirim.',{exact:true})).toBeVisible();
 expect((await post(0,'campaign.preflight',{id:campaign})).approved).toBe(false);
 await p.reload();await p.locator('.side-nav').getByRole('button',{name:/Campaigns/}).click();await p.getByRole('button',{name:/QA campaign.*Buka campaign/}).click();await expect(p.getByLabel('Subject langkah 1',{exact:true})).toHaveValue('Edited intro for {{company}}');
 checks.push('Browser personalization, unsaved approval guard and content invalidation survive reload');
 await p.getByLabel('Urutan lanjutan',{exact:true}).check();await p.getByLabel('Jeda (hari)',{exact:true}).fill('5');await p.getByRole('button',{name:'Simpan draft',exact:true}).click();await expect(p.getByText('Draft tersimpan. Tidak ada pesan dikirim.',{exact:true})).toBeVisible();
 expect(must(await clients[0].from('campaigns').select('steps').eq('id',campaign).single()).steps[1].days).toBe(5);
 await p.getByRole('button',{name:'Condition',exact:true}).click();await p.getByLabel('Kondisi',{exact:true}).selectOption('replied');await p.getByRole('button',{name:'Simpan draft',exact:true}).click();await expect(p.getByText('Draft tersimpan. Tidak ada pesan dikirim.',{exact:true})).toBeVisible();
 expect(must(await clients[0].from('campaigns').select('steps').eq('id',campaign).single()).steps[4].condition).toBe('replied');
 for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,700]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(400);await p.screenshot({path:dir+'/editor-'+width+'.png',fullPage:true});
  const overflow=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,90),width:e.getBoundingClientRect().width}))}));
  await writeFile(dir+'/overflow-'+width+'.json',JSON.stringify(overflow,null,2));expect(overflow.scroll,'Overflow '+width).toBeLessThanOrEqual(width);
  await p.getByRole('tab',{name:'3. Review'}).click();await p.screenshot({path:dir+'/review-'+width+'.png',fullPage:true});expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await p.getByRole('tab',{name:'1. Message'}).click();
 }
 expect(errors).toEqual([]);checks.push('Editable delay and desktop/tablet/mobile screenshots pass with no overflow or JS errors');
 await p.getByRole('tab',{name:'3. Review'}).click();await p.getByRole('button',{name:'Setujui konten',exact:true}).click();await expect(p.getByText('Konten disetujui',{exact:true})).toBeVisible();
 expect((await post(0,'campaign.preflight',{id:campaign})).approved).toBe(true);
 must(await clients[0].from('contacts').update({verification:'unverified'}).eq('id',contact));const after=await post(0,'campaign.preflight',{id:campaign});expect(after.approved).toBe(false);expect(after.content_ready).toBe(false);
 await post(0,'campaign.approve',{id:campaign},400);checks.push('Browser approval persists and revoked contact verification invalidates it server-side');
 passed=true;console.log('PASS: V8 Phase 3 outreach data, review and responsive UI');
}finally{
 for(let i=0;i<2;i++)if(workspaces[i]){
  for(const table of ['campaigns','campaign_templates','contacts','companies','products'])must(await clients[i].from(table).delete().eq('workspace_id',workspaces[i]));
  await contexts[i].request.post(origin+'/auth/action',{headers:{origin},data:{action:'logout'}});await clients[i].auth.signOut({scope:'global'});
 }
 await browser.close();await writeFile(dir+'/results.json',JSON.stringify({passed,checks,errors,userIds:ids,workspaceIds:workspaces,cleanup:'Tenant content removed; sessions signed out. Ban isolated QA identities separately.'},null,2));
}
