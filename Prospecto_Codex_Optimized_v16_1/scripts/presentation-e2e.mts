import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {officeFixture} from '../lib/documents';
import {signLink} from '../lib/server-crypto';
process.loadEnvFile('.env.local');
const origin=process.env.QA_BASE_URL||'http://127.0.0.1:3000',dir=process.env.QA_OUTPUT_DIR||'qa/presentation';await mkdir(dir,{recursive:true});
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const browser=await chromium.launch({channel:'chrome',headless:true}),contexts=await Promise.all([browser.newContext(),browser.newContext()]);
const users=[0,1].map(()=>({email:'prospecto-presentation-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')}));
const clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
const ids:string[]=[],workspaces:string[]=[],checks:string[]=[],errors:string[]=[];let passed=false,restored='';
function must<T>(r:{data:T;error:unknown}):NonNullable<T>{if(r.error)throw new Error('QA data: '+JSON.stringify(r.error));return r.data as NonNullable<T>;}
async function post(i:number,path:string,action:string,extra:Record<string,unknown>={},status=200){const r=await contexts[i].request.post(origin+path,{headers:{origin},data:{action,workspace_id:workspaces[0],...extra}});const v=await r.json();expect(r.status(),v.error).toBe(status);return v;}
const cmd=(action:string,extra:Record<string,unknown>={},status=200)=>post(0,'/api/command',action,extra,status);
const flow=(action:string,extra:Record<string,unknown>={},status=200)=>post(0,'/api/workflow',action,extra,status);
try{
 for(let i=0;i<2;i++){ids.push(must(await admin.auth.admin.createUser({...users[i],email_confirm:true})).user.id);must(await clients[i].auth.signInWithPassword(users[i]));const r=await contexts[i].request.post(origin+'/auth/action',{headers:{origin},data:{action:'login',...users[i]}});expect(r.status()).toBe(200);}
 await cmd('workspace.create',{name:'Isolated presentation QA'});workspaces.push(must(await clients[0].from('workspaces').select('id').single()).id);
 const w=workspaces[0];await flow('presentation.activate',{},403);must(await admin.from('presentation_access').insert({workspace_id:w,granted_by:ids[0]}));expect((await cmd('billing.summary')).subscription).toBeNull();
 await cmd('product.save',{values:{name:'QA Knowledge Alpha',value_proposition:'Membantu tim menyusun informasi produk yang akurat.',industry:'B2B',buyer_roles:'Sales Manager'}});
 const p=must(await clients[0].from('products').select('id').eq('workspace_id',w).single()).id;
 await cmd('source.add',{values:{product_id:p,title:'QA approved material',kind:'note',content:'Knowledge Alpha hanya menggunakan informasi produk yang disetujui. Harga perlu dikonfirmasi tim.'}});
 let source=must(await clients[0].from('knowledge_sources').select('id').eq('workspace_id',w).single()).id;
 expect((await flow('kms.index',{source_id:source})).chunks).toBeGreaterThan(0);expect((await flow('kms.search',{product_id:p,query:'Knowledge Alpha'})).results[0].title).toBe('QA approved material');
 const fixtureSource=await readFile('tests/documents.test.ts','utf8');const functions=fixtureSource.slice(fixtureSource.indexOf('export function wordFixture'),fixtureSource.indexOf("test('OOXML"));const fixtures=new Function('officeFixture',functions.replaceAll('export function','function')+'return {wordFixture,excelFixture};')(officeFixture);
 const doc=Buffer.from(fixtures.wordFixture('Knowledge Alpha DOCX actual text'));
 const upload=await contexts[0].request.post(origin+'/api/upload',{headers:{origin},multipart:{workspace_id:w,product_id:p,file:{name:'QA-knowledge.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:doc}}});expect(upload.status(),await upload.text()).toBe(200);
 source=must(await clients[0].from('knowledge_sources').select('id').eq('workspace_id',w).eq('title','QA-knowledge.docx').single()).id;await flow('kms.index',{source_id:source});
 expect((await flow('kms.search',{product_id:p,query:'DOCX'})).results.some((r:any)=>r.excerpt.includes('DOCX actual text'))).toBe(true);
 const xlsx=await contexts[0].request.post(origin+'/api/import-file',{headers:{origin},multipart:{file:{name:'qa.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(fixtures.excelFixture())}}});expect(xlsx.status(),await xlsx.text()).toBe(200);expect((await xlsx.json()).csv).toContain('QA Contact');
 checks.push('Private note and actual DOCX indexed/searchable; XLSX first sheet parsed through authenticated routes');
 const draft=(await flow('leo.generate',{product_id:p,instruction:'Knowledge Alpha',engine:'template'})).run;expect(draft.engine).toBe('template');expect(draft.result.body).toContain('QA Knowledge Alpha');await flow('leo.generate',{product_id:p,engine:'invalid'},400);
 await post(1,'/api/workflow','kms.search',{product_id:p,query:'Alpha'},403);expect((await clients[1].from('knowledge_documents').select('*')).data).toEqual([]);expect((await clients[0].from('smtp_credentials').select('*')).error).toBeTruthy();
 const invite=await flow('invite.create',{email:users[1].email,send:false});const token=new URL(invite.link).searchParams.get('token')!;expect(token).toMatch(/^[a-f0-9]{64}$/);expect((await clients[0].rpc('accept_workspace_invite',{raw_token:token})).error).toBeTruthy();expect(must(await clients[1].rpc('accept_workspace_invite',{raw_token:token}))).toBe(w);expect(must(await clients[1].from('workspace_memberships').select('role').eq('workspace_id',w).eq('user_id',ids[1]).single()).role).toBe('member');await post(1,'/api/workflow','smtp.connect',{preset:true},403);
 checks.push('Source-labeled template persists; invalid AI engine rejected; tenant and role boundaries; invite requires matching verified email');
 await flow('smtp.connect',{preset:true});const channel=must(await admin.from('channel_connections').select('id,status').eq('workspace_id',w).single());expect(channel.status).toBe('verified');const credential=must(await admin.from('smtp_credentials').select('ciphertext').eq('connection_id',channel.id).single());expect(credential.ciphertext).not.toContain(process.env.SMTP_PASS!);
 await cmd('contact.save',{values:{name:'QA Own Mailbox',email:'hello@elenio.id',company:'Elenio',verification:'verified',source_url:'https://elenio.id'}});const contact=must(await clients[0].from('contacts').select('id').eq('workspace_id',w).single()).id;
 const campaign=(await cmd('campaign.create',{values:{name:'QA functional SMTP check',contact_ids:[contact]}})).id;const subject='Prospecto QA '+randomUUID();
 await cmd('campaign.save',{id:campaign,contact_ids:[contact],values:{name:'QA functional SMTP check',product_id:p,sender_name:'Prospecto QA',steps:[{kind:'email',subject,body:'Halo {{first_name}}, ini pengujian fungsi Prospecto ke mailbox milik sendiri. Tidak perlu membalas.\n\n{{sender_name}}',days:1},{kind:'wait',subject:'',body:'',days:3},{kind:'linkedin_manual',subject:'',body:'QA tugas manual; tidak melakukan tindakan LinkedIn nyata.',days:1}]}});await cmd('campaign.approve',{id:campaign});
 await flow('outreach.launch',{campaign_id:campaign,consent:false,confirm:true},400);const launch=(await flow('outreach.launch',{campaign_id:campaign,consent:true,confirm:true})).id;expect((await flow('outreach.launch',{campaign_id:campaign,consent:true,confirm:true})).id).toBe(launch);
 await flow('outreach.pause',{launch_id:launch});await flow('outreach.process');expect(must(await admin.from('outbound_jobs').select('state').eq('launch_id',launch).single()).state).toBe('pending');await flow('outreach.resume',{launch_id:launch});await flow('outreach.process');
 const sent=must(await admin.from('outbound_jobs').select('id,state,message_id').eq('launch_id',launch).eq('step_index',0).single());expect(sent.state).toBe('sent');expect(sent.message_id).toContain('@elenio.id');await flow('outreach.process');expect(must(await admin.from('outbound_events').select('id').eq('workspace_id',w).eq('event_type','sent'))).toHaveLength(1);
 checks.push('Hostinger TLS credentials verified and encrypted; approved self-mail campaign accepted by SMTP once; duplicate launch/process and pause do not resend');
 const un=new URL('/unsubscribe',origin);un.searchParams.set('job',sent.id);un.searchParams.set('token',signLink('unsubscribe',sent.id));const get=await contexts[0].request.get(un.toString());expect(get.status()).toBe(200);expect(must(await admin.from('smtp_suppressions').select('id').eq('workspace_id',w))).toHaveLength(0);
 const unsub=await contexts[0].request.post(origin+'/unsubscribe/confirm',{headers:{origin},form:{job:sent.id,token:signLink('unsubscribe',sent.id)}});expect(unsub.ok()).toBe(true);expect(must(await admin.from('smtp_suppressions').select('id').eq('workspace_id',w))).toHaveLength(1);
 const backup=await contexts[0].request.post(origin+'/api/workspace-backup',{headers:{origin},data:{workspace_id:w}});expect(backup.status(),await backup.text()).toBe(200);const zipped=await backup.body();const restore=await contexts[0].request.post(origin+'/api/workspace-backup',{headers:{origin},multipart:{file:{name:'backup.zip',mimeType:'application/zip',buffer:zipped}}});expect(restore.status(),await restore.text()).toBe(200);restored=(await restore.json()).workspace_id;workspaces.push(restored);expect(must(await clients[0].from('products').select('id').eq('workspace_id',restored))).toHaveLength(1);expect(must(await admin.from('campaign_launches').select('id').eq('workspace_id',restored))).toHaveLength(0);expect(must(await admin.from('channel_connections').select('id').eq('workspace_id',restored))).toHaveLength(0);
 checks.push('Unsubscribe GET does not mutate, confirmed POST suppresses; ZIP restore creates new workspace with private files and no sender/execution');
 const page=await contexts[0].newPage();page.on('pageerror',e=>errors.push(e.message));await cmd('workspace.switch',{workspace_id:w});await page.goto(origin+'/app');await expect(page.getByRole('button',{name:'Ask LEO'})).toBeEnabled();
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});
  for(const section of ['My Products','Campaigns','Settings','Subscription & Credits']){
   const menu=page.getByRole('button',{name:'Buka navigasi',exact:true});
   if(await menu.isVisible())await menu.click();
   await page.locator('.side-nav button').filter({hasText:section}).click();
   if(await menu.isVisible())await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:`${dir}/${section.replaceAll(' ','-').replaceAll('&','and')}-${width}.png`,fullPage:true,animations:'disabled'});
  }
 }
 expect(errors).toEqual([]);checks.push('Authenticated operational screens render at 1440/390/320 without page errors or horizontal overflow');
 const worker=await contexts[0].request.post(origin+'/api/worker');expect(worker.status()).toBe(401);expect((await contexts[0].request.get(origin+'/api/health')).status()).toBe(200);
 await writeFile(dir+'/mail-evidence.json',JSON.stringify({subject,messageId:sent.message_id,launch,workspace:w,ownMailboxOnly:true},null,2));passed=true;
}finally{
 for(const w of workspaces){await admin.from('campaign_launches').update({state:'canceled'}).eq('workspace_id',w).in('state',['queued','active','paused']);await admin.from('outbound_jobs').update({state:'canceled',note:'Isolated QA cleanup'}).eq('workspace_id',w).in('state',['pending','manual']);await admin.from('smtp_suppressions').delete().eq('workspace_id',w);const channels=(await admin.from('channel_connections').select('id').eq('workspace_id',w)).data||[];for(const c of channels)await admin.from('smtp_credentials').delete().eq('connection_id',c.id);const sources=(await admin.from('knowledge_sources').select('storage_path').eq('workspace_id',w)).data||[];const paths=sources.map(s=>s.storage_path).filter(Boolean);if(paths.length)await admin.storage.from('product-kms').remove(paths);}
 for(let i=0;i<ids.length;i++){await clients[i].auth.signOut({scope:'global'});must(await admin.auth.admin.updateUserById(ids[i],{ban_duration:'876000h'}));}
 await writeFile(dir+'/results.json',JSON.stringify({passed,checks,browserErrors:errors,isolatedQAUsersBanned:ids.length,workspaceCount:workspaces.length,qaContentRetainedForAudit:true,at:new Date().toISOString()},null,2));await browser.close();console.log(JSON.stringify({passed,checks}));
}
