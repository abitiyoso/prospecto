import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
process.loadEnvFile('.env.local');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3000',dir=process.env.QA_OUTPUT_DIR||'qa/leo';await mkdir(dir,{recursive:true});
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}}),browser=await chromium.launch({channel:'chrome',headless:true});
const users=[0,1].map(()=>({email:'prospecto-leo-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')})),ids:string[]=[],contexts=await Promise.all(users.map(()=>browser.newContext({reducedMotion:'reduce'}))),clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
let w='',passed=false;const checks:string[]=[],errors:string[]=[],evidence:Record<string,unknown>={};
function must<T>(r:{data:T;error:unknown}):NonNullable<T>{if(r.error){const e=r.error as {code?:string;status?:number};throw Error('QA database operation failed ('+(e.code||e.status||'connection')+')');}return r.data as NonNullable<T>;}
async function post(route:string,action:string,extra:Record<string,unknown>={},status=200,i=0){const r=await contexts[i].request.post(base+route,{headers:{origin:base},data:{action,workspace_id:w,...extra}});const v=await r.json();expect(r.status(),v.error).toBe(status);return v;}
const cmd=(action:string,extra:Record<string,unknown>={})=>post('/api/command',action,extra);
try{
 for(let i=0;i<users.length;i++){ids.push(must(await admin.auth.admin.createUser({...users[i],email_confirm:true})).user.id);must(await clients[i].auth.signInWithPassword(users[i]));expect((await contexts[i].request.post(base+'/auth/action',{headers:{origin:base},data:{action:'login',...users[i]}})).status()).toBe(200);}
 await cmd('workspace.create',{name:'Isolated real LEO AI QA'});w=must(await clients[0].from('workspaces').select('id').single()).id;
 await cmd('product.save',{values:{name:'QA Knowledge Alpha',industry:'B2B software',value_proposition:'Membantu tim sales menyusun informasi produk yang disetujui.',pricing_context:'Harga dikonfirmasi langsung oleh tim.'}});
 const p=must(await clients[0].from('products').select('id').eq('workspace_id',w).single()).id;
 await cmd('icp.save',{values:{product_id:p,industry:'B2B software',location:'Jakarta',buyer_roles:'Sales Manager'}});
 await cmd('source.add',{values:{product_id:p,kind:'note',title:'Materi Knowledge Alpha disetujui',content:'Knowledge Alpha membantu tim sales mengelola informasi produk yang disetujui. Fitur yang disetujui: pencarian pengetahuan produk. Tidak ada jaminan kenaikan penjualan. Harga perlu dikonfirmasi langsung oleh tim.'}});
 const source=must(await clients[0].from('knowledge_sources').select('id').eq('workspace_id',w).single()).id;
 await post('/api/workflow','kms.index',{source_id:source});
 const page=await contexts[0].newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/app');await page.getByRole('button',{name:'Ask LEO',exact:true}).click();const dialog=page.getByRole('dialog',{name:'LEO',exact:true});
 await expect(dialog).toBeVisible();await dialog.getByLabel('Produk untuk draft LEO',{exact:true}).selectOption(p);await dialog.getByLabel('Arahan untuk draft',{exact:true}).fill('Knowledge Alpha: buat email perkenalan singkat untuk Sales Manager berdasarkan materi disetujui. Sebut fitur pencarian pengetahuan produk dan ajak diskusi singkat. Jangan sertakan harga atau hasil penjualan. Sertakan sumber KMS yang relevan.');
 await expect(dialog.getByRole('button',{name:'Buat dengan AI',exact:true})).toBeEnabled();
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/workflow')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='leo.generate',{timeout:90000});
 await dialog.getByRole('button',{name:'Buat dengan AI',exact:true}).click();const response=await responsePromise,value=await response.json();if(response.status()!==200)throw Error('LEO generation HTTP '+response.status()+' ('+(value.code||'unknown')+')');const run=value.run;
 expect(run.engine).toBe('9router');expect(run.model).toBeTruthy();expect(run.requested_model).toBe(process.env.NINE_ROUTER_MODEL);expect(run.result.body.length).toBeGreaterThan(30);expect(run.result.source_ids).toContain(source);expect(run.source_refs.some((r:any)=>r.source_id===source)).toBe(true);expect(run.source_refs.every((r:any)=>['product',source].includes(r.source_id))).toBe(true);
 await expect(dialog.getByText('Draft AI',{exact:true})).toBeVisible();await expect(dialog.getByRole('heading',{name:run.result.subject,exact:true})).toBeVisible();
 const persisted=must(await clients[0].from('leo_runs').select('engine,model,requested_model,result,source_refs').eq('id',run.id).single());expect(persisted.result).toEqual(run.result);
 evidence.provider=run.engine;evidence.requestedModel=run.requested_model;evidence.actualModel=run.model;evidence.sourceCount=run.source_refs.length;evidence.subject=run.result.subject;
 checks.push('Actual UI generation calls 9Router, validates JSON and workspace citations, then persists real provider/model/output');
 await page.reload();await page.getByRole('button',{name:'Ask LEO',exact:true}).click();await dialog.getByLabel('Draft LEO tersimpan',{exact:true}).selectOption(run.id);await expect(dialog.getByRole('heading',{name:run.result.subject,exact:true})).toBeVisible();
 for(const width of [1440,1024,390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(dialog.getByText('Draft AI',{exact:true})).toBeVisible();await page.screenshot({path:`${dir}/leo-${width}.png`,fullPage:true,animations:'disabled'});}
 checks.push('Saved AI draft and citations survive full reload and fit desktop/tablet/mobile widths');await page.getByRole('button',{name:'Tutup LEO',exact:true}).click();
 await post('/api/workflow','leo.generate',{product_id:p,engine:'ai'},403,1);expect(must(await clients[1].from('leo_runs').select('id').eq('id',run.id))).toEqual([]);expect(must(await clients[1].from('knowledge_documents').select('source_id').eq('source_id',source))).toEqual([]);
 const template=(await post('/api/workflow','leo.generate',{product_id:p,engine:'template'})).run;expect(template.engine).toBe('template');expect(template.model).toBe('');checks.push('Foreign tenant denied AI access and saved-run/KMS reads; template remains explicitly separate');
 await cmd('contact.save',{values:{name:'QA First',email:'first@example.com',company_name:'QA Company'}});const contact=must(await clients[0].from('contacts').select('id').eq('workspace_id',w).single()).id;
 const c=(await cmd('campaign.create',{values:{name:'QA draft application',contact_ids:[contact]}})).id;const before=must(await clients[0].from('campaigns').select('steps').eq('id',c).single());await cmd('campaign.save',{id:c,values:{name:'QA draft application',product_id:p,sender_name:'QA Sender',steps:before.steps},contact_ids:[contact]});
 await page.setViewportSize({width:1440,height:1000});await page.reload();await page.locator('.side-nav button').filter({hasText:'Campaigns'}).click();await page.locator('.p-campaign-card').click();await page.getByLabel('Draft LEO tersimpan',{exact:true}).selectOption(run.id);await page.getByRole('button',{name:'Gunakan draft ini',exact:true}).click();
 await expect(page.getByLabel('Subject langkah 1',{exact:true})).toHaveValue(run.result.subject);await expect(page.locator('.outreach-step').first().locator('textarea')).toHaveValue(run.result.body);
 expect(must(await clients[0].from('campaigns').select('steps').eq('id',c).single()).steps).toEqual(before.steps);await page.getByRole('button',{name:'Simpan draft',exact:true}).click();await expect(page.getByText('Draft tersimpan. Tidak ada pesan dikirim.',{exact:true})).toBeVisible();
 const saved=must(await clients[0].from('campaigns').select('steps').eq('id',c).single());expect(saved.steps[0].subject).toBe(run.result.subject);expect(saved.steps[0].body).toBe(run.result.body);expect(must(await admin.from('campaign_launches').select('id').eq('workspace_id',w))).toEqual([]);expect(must(await admin.from('outbound_events').select('id').eq('workspace_id',w))).toEqual([]);
 checks.push('Apply AI fills editor only; explicit Save persists campaign content, without launch, approval or outbound messages');expect(errors).toEqual([]);passed=true;
}finally{
 for(let i=0;i<ids.length;i++){await clients[i].auth.signOut({scope:'global'});must(await admin.auth.admin.updateUserById(ids[i],{ban_duration:'876000h'}));}
 await writeFile(dir+'/results.json',JSON.stringify({passed,checks,evidence,errors,emailsSent:0,campaignsLaunched:0,qaUsersBanned:ids.length,qaMetadataRetained:true,at:new Date().toISOString()},null,2));await browser.close();console.log(JSON.stringify({passed,checks,evidence,errors}));
}
