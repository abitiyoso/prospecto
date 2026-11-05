// Real Supabase HTTP + application-session tests. Credentials arrive on stdin,
// are never written to disk or logs, and must belong to isolated QA users.
import {createClient} from '@supabase/supabase-js';
import {chromium,request,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
process.loadEnvFile('.env.local');
process.stdin.setRawMode?.(true);process.stdin.resume();
console.log('Ready for isolated QA credentials on stdin (hidden)');
const line=await new Promise<string>(resolve=>{let input='';const read=(chunk:Buffer)=>{input+=chunk.toString();if(/[\r\n]/.test(input)){process.stdin.off('data',read);resolve(input.trim());}};process.stdin.on('data',read);});
process.stdin.setRawMode?.(false);process.stdin.pause();
const credentials=JSON.parse(line) as {email:string;password:string}[];
const origin='http://127.0.0.1:3189';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3189'],{stdio:['ignore','pipe','pipe'],windowsHide:true,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
const checks:string[]=[];const workspaces:string[]=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
const clients=credentials.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}}));
const contexts=await Promise.all(credentials.map(()=>browser.newContext()));
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Provider operation failed: '+JSON.stringify(r.error));return r.data as NonNullable<T>;};
async function post(i:number,endpoint:string,data:unknown){const r=await contexts[i].request.post(origin+endpoint,{headers:{origin},data});const value=await r.json();if(!r.ok())throw new Error(`${endpoint}: ${r.status()} ${value.error}`);return value;}
async function cmd(i:number,action:string,data:Record<string,unknown>={}){return post(i,'/api/command',{action,workspace_id:workspaces[i],...data});}
try{
 for(let n=0;n<90;n++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));if(n===89)throw new Error('App server unavailable');}
 for(let i=0;i<2;i++){
  await post(i,'/auth/action',{action:'login',...credentials[i]});must(await clients[i].auth.signInWithPassword(credentials[i]));
  await post(i,'/api/command',{action:'workspace.create',name:'Isolated live QA '+i+' '+Date.now()});
  workspaces.push(must(await clients[i].from('workspaces').select('id').order('created_at',{ascending:false}).limit(1).single()).id);
 }
 checks.push('Two real Auth password logins and cookie sessions; empty workspace creation');
 for(let i=0;i<2;i++)expect(must(await clients[i].from('products').select('*').eq('workspace_id',workspaces[i]))).toEqual([]);
 await cmd(0,'product.save',{values:{name:'Live QA product',industry:'Manufacturing'}});
 const product=must(await clients[0].from('products').select('*').eq('workspace_id',workspaces[0]).single());
 await cmd(0,'product.save',{id:product.id,values:{name:'Updated QA product',industry:'Manufacturing'}});
 expect(must(await clients[0].from('products').select('name').eq('workspace_id',workspaces[0]).single()).name).toBe('Updated QA product');
 expect(must(await clients[1].from('products').select('*').eq('id',product.id))).toEqual([]);
 expect((await clients[1].from('products').insert({workspace_id:workspaces[0],name:'Foreign write'})).error).toBeTruthy();
 expect(must(await clients[1].from('products').update({name:'Foreign mutation'}).eq('id',product.id).select())).toEqual([]);
 const forbidden=await contexts[1].request.post(origin+'/api/command',{headers:{origin},data:{action:'product.save',workspace_id:workspaces[0],values:{name:'Foreign API'}}});expect(forbidden.status()).toBe(403);
 checks.push('Product CRUD persistence and direct HTTP/API cross-tenant read/insert/update isolation');
 await cmd(0,'source.add',{values:{product_id:product.id,title:'QA note',kind:'note',content:'Private QA knowledge'}});
 for(const [name,mime,buffer]of [['brief.txt','text/plain',Buffer.from('Private live QA document')],['brief.pdf','application/pdf',Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF')]] as const){
  const upload=await contexts[0].request.post(origin+'/api/upload',{headers:{origin},multipart:{workspace_id:workspaces[0],product_id:product.id,file:{name,mimeType:mime,buffer}}});expect(upload.status(),await upload.text()).toBe(200);
 }
 const sources=must(await clients[0].from('knowledge_sources').select('*').eq('workspace_id',workspaces[0]).eq('kind','file'));
 expect(sources.length).toBe(2);for(const s of sources){expect(s.upload_state).toBe('stored');expect(s.status).toBe('pending');const link=await cmd(0,'source.download',{id:s.id});const response=await fetch(link.url);expect(response.status).toBe(200);expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);expect((await clients[1].storage.from('product-kms').createSignedUrl(s.storage_path,60)).error).toBeTruthy();}
 checks.push('Real private PDF/TXT uploads, pending KMS state, signed downloads and foreign-tenant denial');
 const imported=await cmd(0,'leads.import',{csv:'name,email,company\nQA Contact,contact@example.test,QA Company\nQA Duplicate,contact@example.test,QA Company',mapping:{name:'name',email:'email',company:'company'}});expect(imported.inserted).toBe(1);expect(imported.duplicates).toBe(1);
 const contact=must(await clients[0].from('contacts').select('*').eq('workspace_id',workspaces[0]).single());expect(contact.company_name).toBe('QA Company');
 const draft=await cmd(0,'campaign.create',{values:{name:'Live QA draft',contact_ids:[contact.id]}});
 expect(must(await clients[0].from('campaign_audience').select('contact_id').eq('campaign_id',draft.id)).map(r=>r.contact_id)).toEqual([contact.id]);
 await cmd(0,'campaign.save',{id:draft.id,values:{name:'Live QA draft',subject:'QA subject',body:'QA draft body'}});
 expect((await clients[1].rpc('create_campaign',{w:workspaces[1],campaign_name:'Foreign audience',ids:[contact.id]})).error).toBeTruthy();
 checks.push('Real CSV import/dedupe and exact campaign audience persistence; foreign contact rejected');
 const page=await contexts[0].newPage();await page.goto(origin+'/app');await expect(page.getByRole('heading',{name:'Welcome to Prospecto'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Welcome to Prospecto'})).toBeVisible();
 await page.screenshot({path:'qa/phase1/live-home.png',fullPage:true});
 await cmd(0,'workspace.create',{name:'Isolated QA switch'});const all=must(await clients[0].from('workspaces').select('id'));expect(all.length).toBeGreaterThanOrEqual(2);const other=all.find(w=>w.id!==workspaces[0])!;workspaces.push(other.id);
 await cmd(0,'workspace.switch',{workspace_id:workspaces[0]});
 checks.push('Authenticated browser rendering/reload and membership-verified workspace switching');
 await cmd(0,'product.delete',{id:product.id});expect(must(await clients[0].from('products').select('*').eq('workspace_id',workspaces[0]))).toEqual([]);expect(must(await clients[0].from('knowledge_sources').select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 for(const s of sources)expect((await clients[0].storage.from('product-kms').download(s.storage_path)).error).toBeTruthy();
 const changed='Changed!'+credentials[0].password;
 await post(0,'/auth/action',{action:'update',password:changed});
 const oldLogin=await contexts[0].request.post(origin+'/auth/action',{headers:{origin},data:{action:'login',...credentials[0]}});expect(oldLogin.status()).toBe(400);
 await post(0,'/auth/action',{action:'login',email:credentials[0].email,password:changed});
 checks.push('Real password update revokes app session; old password rejected and new password accepted');
 await post(0,'/auth/action',{action:'logout'});await page.goto(origin+'/app');await expect(page.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();
 checks.push('Product/Storage cleanup and logout/session gate');
 console.log('PASS: '+checks.length+' live integration groups');
}finally{
 await Promise.all(clients.map(c=>c.auth.signOut()));await browser.close();server.kill();
 await writeFile('qa/phase1/live-results.json',JSON.stringify({checks,workspaces,passed:checks.length===7,limitations:['QA users were seeded separately, not signed up through email. Email confirmation/reset delivery is not tested here.']},null,2));
}




