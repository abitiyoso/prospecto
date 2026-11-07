import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {zipSync,unzipSync} from 'fflate';
process.loadEnvFile('.env.local');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3000',dir=process.env.QA_OUTPUT_DIR||'qa/functional-repair';await mkdir(dir,{recursive:true});
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}}),browser=await chromium.launch({channel:'chrome',headless:true});
const users=[0,1,2].map(()=>({email:'prospecto-repair-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')}));
const contexts=await Promise.all(users.map(()=>browser.newContext({reducedMotion:'reduce'}))),clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
const ids:string[]=[],workspaces:string[]=[],checks:string[]=[],errors:string[]=[];let passed=false;
function must<T>(r:{data:T;error:unknown}):NonNullable<T>{if(r.error)throw Error('QA database operation failed: '+JSON.stringify(r.error));return r.data as NonNullable<T>;}
async function post(i:number,route:string,action:string,extra:Record<string,unknown>={},status=200){const r=await contexts[i].request.post(base+route,{headers:{origin:base},data:{action,workspace_id:workspaces[0],...extra}}),v=await r.json();expect(r.status(),v.error).toBe(status);return v;}
const cmd=(action:string,extra:Record<string,unknown>={},status=200)=>post(0,'/api/command',action,extra,status);
const flow=(action:string,extra:Record<string,unknown>={},status=200)=>post(0,'/api/workflow',action,extra,status);
try{
 for(let i=0;i<users.length;i++){ids.push(must(await admin.auth.admin.createUser({...users[i],email_confirm:true})).user.id);must(await clients[i].auth.signInWithPassword(users[i]));expect((await contexts[i].request.post(base+'/auth/action',{headers:{origin:base},data:{action:'login',...users[i]}})).status()).toBe(200);}
 await cmd('workspace.create',{name:'Isolated functional repair QA'});workspaces.push(must(await clients[0].from('workspaces').select('id').single()).id);const w=workspaces[0];
 await cmd('product.save',{values:{name:'QA Functional Product',industry:'Software',value_proposition:'Approved product knowledge'}});const p=must(await clients[0].from('products').select('id').eq('workspace_id',w).single()).id;
 await cmd('source.add',{values:{product_id:p,kind:'note',title:'QA note',content:'Approved product knowledge'}});const note=must(await clients[0].from('knowledge_sources').select('id').eq('workspace_id',w).single()).id;await flow('kms.index',{source_id:note});
 const upload=await contexts[0].request.post(base+'/api/upload',{headers:{origin:base},multipart:{workspace_id:w,product_id:p,file:{name:'qa-knowledge.txt',mimeType:'text/plain',buffer:Buffer.from('Private file in backup')}}});expect(upload.status()).toBe(200);const file=must(await clients[0].from('knowledge_sources').select('id').eq('workspace_id',w).eq('kind','file').single()).id;
 await cmd('contact.save',{values:{name:'QA First',email:'first@example.com'}});await cmd('contact.save',{values:{name:'QA Second',email:'second@example.com'}});const contacts=must(await clients[0].from('contacts').select('id').eq('workspace_id',w).order('email')).map(c=>c.id);
 const list=(await cmd('list.save',{values:{name:'QA shortlist',contact_ids:contacts}})).id;await cmd('list.save',{values:{id:list,name:'QA shortlist',contact_ids:[contacts[0]]}});expect(must(await clients[0].from('lead_list_members').select('*').eq('list_id',list))).toHaveLength(1);
 await post(2,'/api/command','list.save',{values:{name:'Foreign injection',contact_ids:contacts}},403);expect((await clients[2].from('lead_lists').select('*')).data).toEqual([]);checks.push('Saved lead lists persist, replace atomically, filter contacts, and reject foreign workspace access');
 const invitation=await flow('invite.create',{email:users[1].email,send:false}),token=new URL(invitation.link).searchParams.get('token')!;must(await clients[1].rpc('accept_workspace_invite',{raw_token:token}));
 expect((await clients[1].rpc('manage_workspace_member',{w,target:ids[1],new_role:'admin'})).error).toBeTruthy();await flow('team.change',{user_id:ids[1],role:'admin'});expect(must(await clients[1].from('workspace_memberships').select('role').eq('workspace_id',w).eq('user_id',ids[1]).single()).role).toBe('admin');
 await flow('team.remove',{user_id:ids[0]},400);const other=await flow('invite.create',{email:users[2].email,send:false});await flow('invite.revoke',{invite_id:other.id});expect((await clients[2].rpc('accept_workspace_invite',{raw_token:new URL(other.link).searchParams.get('token')})).error).toBeTruthy();
 const page=await contexts[0].newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/app');
 async function go(section:string){const menu=page.getByRole('button',{name:'Buka navigasi',exact:true});if(await menu.isVisible())await menu.click();await page.locator('.side-nav button').filter({hasText:section}).click();if(await menu.isVisible())await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);}
 await go('My Products');await expect(page.locator('.p-source').filter({hasText:'QA note'})).toContainText('Siap dicari');
 await go('Leads');await page.getByLabel('Filter daftar leads',{exact:true}).selectOption(list);await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByLabel('Filter daftar leads',{exact:true}).selectOption('');await expect(page.locator('tbody tr')).toHaveCount(2);
 await go('Settings');await expect(page.getByLabel('Peran '+users[1].email,{exact:true})).toHaveValue('admin');await expect(page.getByText('Dicabut',{exact:true})).toBeVisible();
 for(const width of [1440,1024,390,320]){await page.setViewportSize({width,height:900});for(const section of ['Leads','Settings','My Products']){await go(section);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${dir}/${section.replaceAll(' ','-')}-${width}.png`,fullPage:true,animations:'disabled'});}}
 checks.push('Ready KMS label, saved-list filter, team role controls and revoked invite status render correctly at four widths');
 await flow('team.remove',{user_id:ids[1]});expect((await clients[1].rpc('accept_workspace_invite',{raw_token:token})).error).toBeTruthy();await post(1,'/api/command','product.save',{values:{name:'Revoked write'}},403);expect(must(await clients[1].from('products').select('*').eq('workspace_id',w))).toEqual([]);checks.push('Owner protected; owner role change works; removed member loses reads/writes and cannot reuse accepted invitation');
 // Preserve a legitimate empty-audience draft when restoring.
 must(await clients[0].from('campaigns').insert({workspace_id:w,name:'QA empty draft',product_id:p}));
 await page.reload();await go('Campaigns');await page.locator('.p-campaign-card').click();await page.getByRole('tab',{name:'3. Review',exact:true}).click();await expect(page.getByText('0 pekerjaan · belum ada antrean',{exact:true})).toBeVisible();
 await page.screenshot({path:dir+'/Campaign-review-320.png',fullPage:true,animations:'disabled'});
 await cmd('workspace.rename',{name:'A'.repeat(150)});
 const backup=await contexts[0].request.post(base+'/api/workspace-backup',{headers:{origin:base},data:{workspace_id:w}});expect(backup.status(),await backup.text()).toBe(200);const bytes=await backup.body(),files=unzipSync(bytes);delete files['files/'+file];
 const before=must(await clients[0].from('workspaces').select('id')).length,bad=await contexts[0].request.post(base+'/api/workspace-backup',{headers:{origin:base},multipart:{file:{name:'missing.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync(files))}}});expect(bad.status()).toBe(400);expect((await bad.json()).error).toContain('berkas KMS');expect(must(await clients[0].from('workspaces').select('id'))).toHaveLength(before);
 const restore=await contexts[0].request.post(base+'/api/workspace-backup',{headers:{origin:base},multipart:{file:{name:'valid.zip',mimeType:'application/zip',buffer:bytes}}});expect(restore.status(),await restore.text()).toBe(200);const restored=(await restore.json()).workspace_id;workspaces.push(restored);
 const restoredName=must(await clients[0].from('workspaces').select('name').eq('id',restored).single()).name;expect(restoredName.length).toBeLessThanOrEqual(160);expect(restoredName.endsWith(' (restored)')).toBe(true);
 expect(must(await clients[0].from('lead_lists').select('id').eq('workspace_id',restored))).toHaveLength(1);expect(must(await clients[0].from('lead_list_members').select('*').eq('workspace_id',restored))).toHaveLength(1);expect(must(await clients[0].from('campaigns').select('id').eq('workspace_id',restored))).toHaveLength(1);
 const stored=must(await clients[0].from('knowledge_sources').select('storage_path').eq('workspace_id',restored).eq('kind','file').single());const blob=must(await clients[0].storage.from('product-kms').download(stored.storage_path));expect(await blob.text()).toBe('Private file in backup');expect(must(await admin.from('campaign_launches').select('id').eq('workspace_id',restored))).toHaveLength(0);
 checks.push('Missing original file rejects before workspace creation; long-name backup restores private bytes, named lists, membership and empty draft without execution');
 const originalCampaign=must(await clients[0].from('campaigns').select('id').eq('workspace_id',w).single()).id;expect((await flow('outreach.history',{campaign_id:originalCampaign,offset:0})).total).toBe(0);await post(2,'/api/workflow','outreach.history',{campaign_id:originalCampaign},403);
 expect(errors).toEqual([]);passed=true;
}finally{
 for(const w of workspaces){const sources=(await admin.from('knowledge_sources').select('storage_path').eq('workspace_id',w)).data||[];const paths=sources.map(s=>s.storage_path).filter(Boolean);if(paths.length)await admin.storage.from('product-kms').remove(paths);}
 for(let i=0;i<ids.length;i++){await clients[i].auth.signOut({scope:'global'});must(await admin.auth.admin.updateUserById(ids[i],{ban_duration:'876000h'}));}
 await writeFile(dir+'/results.json',JSON.stringify({passed,checks,errors,emailsSent:0,campaignsLaunched:0,qaUsersBanned:ids.length,qaMetadataRetained:true,at:new Date().toISOString()},null,2));await browser.close();console.log(JSON.stringify({passed,checks,errors}));
}
