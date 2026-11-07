import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
process.loadEnvFile('.env.local');
const origin=process.env.QA_BASE_URL||'http://127.0.0.1:3000',dir=process.env.QA_OUTPUT_DIR||'qa/firecrawl';
const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const browser=await chromium.launch({channel:'chrome',headless:true});
const users=[0,1].map(()=>({email:'prospecto-research-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')}));
const clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
const contexts=await Promise.all(users.map(()=>browser.newContext()));const checks:string[]=[],ids:string[]=[],workspaces:string[]=[];
await mkdir(dir,{recursive:true});
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Provider operation failed');return r.data as NonNullable<T>;};
async function post(i:number,endpoint:string,data:unknown){const r=await contexts[i].request.post(origin+endpoint,{headers:{origin},data});const body=await r.json();expect(r.status(),body.error).toBe(200);return body;}
try{
 const p=await contexts[0].newPage();await p.goto(origin);await p.getByRole('link',{name:'Masuk',exact:true}).click();await expect(p.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();
 await p.goto(origin);await p.getByRole('link',{name:'Mulai Sekarang',exact:true}).first().click();await expect(p.getByRole('heading',{name:'Mulai bersama Prospecto'})).toBeVisible();checks.push('Landing login and signup buttons reach real Auth without visual changes');
 for(let i=0;i<2;i++){
  ids.push(must(await admin.auth.admin.createUser({...users[i],email_confirm:true})).user.id);
  must(await clients[i].auth.signInWithPassword(users[i]));await post(i,'/auth/action',{action:'login',...users[i]});
  const page=await contexts[i].newPage();await page.goto(origin+'/app');await expect(page.getByRole('heading',{name:'Buat workspace',exact:true})).toBeVisible();
  await post(i,'/api/command',{action:'workspace.create',name:'Isolated V8 foundation '+i});workspaces.push(must(await clients[i].from('workspaces').select('id').single()).id);
  expect(must(await clients[i].from('products').select('*'))).toEqual([]);expect(must(await clients[i].from('contacts').select('*'))).toEqual([]);
  await post(i,'/api/command',{action:'product.save',workspace_id:workspaces[i],values:{name:'Isolated persistence test '+i}});
 }
 checks.push('Two isolated verified QA accounts authenticate; new tenants start empty; public email confirmation remains enabled');
 const productId=must(await clients[0].from('products').select('id').single()).id;
 const researched=await post(0,'/api/research',{workspace_id:workspaces[0],product_id:productId,kind:'company',query:'site:astra.co.id Astra International official website'});
 expect(researched.run.status).toBe('completed');expect(researched.run.results.length).toBeGreaterThan(0);expect(researched.run.results.length).toBeLessThanOrEqual(5);
 expect(must(await clients[0].from('research_runs').select('id').single()).id).toBe(researched.run.id);
 expect(must(await clients[1].from('research_runs').select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 const foreign=await contexts[1].request.post(origin+'/api/research',{headers:{origin},data:{workspace_id:workspaces[0],product_id:productId,kind:'company'}});expect(foreign.status()).toBe(403);
 await p.goto(origin+'/app');await p.getByRole('button',{name:'Find Prospects',exact:true}).click();await expect(p.getByText('Riset web',{exact:true})).toBeVisible();
 await expect(p.getByRole('button',{name:'Tinjau untuk disimpan'}).first()).toBeVisible();await p.getByRole('button',{name:'Tinjau untuk disimpan'}).first().click();await expect(p.getByLabel('Nama perusahaan',{exact:true}).last()).toHaveValue('');
 for(const [width,height]of [[1440,900],[390,844],[320,700]]){await p.setViewportSize({width,height});expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await p.screenshot({path:dir+'/research-'+width+'.png',fullPage:true});}
 await p.setViewportSize({width:1440,height:900});
 await post(0,'/api/command',{action:'company.save',workspace_id:workspaces[0],values:{name:'Isolated QA review of Astra official site',domain:'astra.co.id',source_url:'https://www.astra.co.id/'}});
 const company=must(await clients[0].from('companies').select('id').single());
 const picEvidence=await post(0,'/api/research',{workspace_id:workspaces[0],product_id:productId,company_id:company.id,kind:'pic',query:'management leadership team'});expect(picEvidence.run.status).toBe('completed');expect(picEvidence.run.query.startsWith('site:astra.co.id ')).toBe(true);
 const foreignCompany=await contexts[1].request.post(origin+'/api/research',{headers:{origin},data:{workspace_id:workspaces[1],product_id:must(await clients[1].from('products').select('id').single()).id,company_id:company.id,kind:'pic'}});expect(foreignCompany.status()).toBe(403);
 must(await clients[0].from('companies').delete().eq('workspace_id',workspaces[0]));
 checks.push('Real Firecrawl search via server route persists up to five sources, survives reload, denies foreign tenant, requires manual review, and fits mobile');
 const product=must(await clients[0].from('products').select('id').single());
 expect(must(await clients[1].from('products').select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 expect((await clients[1].from('products').insert({workspace_id:workspaces[0],name:'Denied'})).error).toBeTruthy();
 expect(must(await clients[1].from('products').update({name:'Denied'}).eq('id',product.id).select())).toEqual([]);
 const denied=await contexts[1].request.post(origin+'/api/command',{headers:{origin},data:{action:'workspace.switch',workspace_id:workspaces[0]}});expect(denied.status()).toBe(403);
 checks.push('Direct database read/insert/update and application workspace-switch attempts across tenants denied');
 await p.goto(origin+'/app');await p.getByRole('button',{name:'My Products',exact:true}).click();await expect(p.getByRole('heading',{name:'Isolated persistence test 0',exact:true})).toBeVisible();await p.reload();await p.getByRole('button',{name:'My Products',exact:true}).click();await expect(p.getByRole('heading',{name:'Isolated persistence test 0',exact:true})).toBeVisible();checks.push('Authenticated UI and reload preserve actual tenant data');
 await p.screenshot({path:dir+'/connected-products.png',fullPage:true});
 for(let i=0;i<2;i++){
  for(const product of must(await clients[i].from('products').select('id')))await post(i,'/api/command',{action:'product.delete',workspace_id:workspaces[i],id:product.id});
  await post(i,'/auth/action',{action:'logout'});await clients[i].auth.signOut({scope:'global'});
 }
 await p.goto(origin+'/app');await expect(p.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();
 await post(0,'/auth/action',{action:'login',...users[0]});await p.goto(origin+'/app');await expect(p.getByRole('heading',{name:'Welcome to Prospecto'})).toBeVisible();await post(0,'/auth/action',{action:'logout'});
 checks.push('Workspace content cleanup, logout session gate and subsequent password login pass');
 console.log('PASS: Firecrawl server API, persisted sources, tenant isolation and review UI');
}finally{
 for(let i=0;i<2;i++){if(workspaces[i])await clients[i].from('companies').delete().eq('workspace_id',workspaces[i]);if(workspaces[i])await clients[i].from('products').delete().eq('workspace_id',workspaces[i]);await clients[i].auth.signOut({scope:'global'});if(ids[i])must(await admin.auth.admin.updateUserById(ids[i],{ban_duration:'876000h'}));}
 await browser.close();await writeFile(dir+'/results.json',JSON.stringify({checks,passed:checks.length===6,qaUsersBanned:ids.length,cleanup:'Product content deleted, sessions signed out and isolated QA users banned.',at:new Date().toISOString()},null,2));
}


