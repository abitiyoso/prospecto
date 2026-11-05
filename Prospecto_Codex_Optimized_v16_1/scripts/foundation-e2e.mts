import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
process.loadEnvFile('.env.local');
const origin='http://127.0.0.1:3000';
const browser=await chromium.launch({channel:'chrome',headless:true});
const users=[0,1].map(()=>({email:'prospecto-foundation-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')}));
const clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
const contexts=await Promise.all(users.map(()=>browser.newContext()));const checks:string[]=[],ids:string[]=[],workspaces:string[]=[];
await mkdir('qa/v8-phase1',{recursive:true});
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Provider operation failed');return r.data as NonNullable<T>;};
async function post(i:number,endpoint:string,data:unknown){const r=await contexts[i].request.post(origin+endpoint,{headers:{origin},data});const body=await r.json();expect(r.status(),body.error).toBe(200);return body;}
try{
 const p=await contexts[0].newPage();await p.goto(origin);await p.getByRole('link',{name:'Masuk',exact:true}).click();await expect(p.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();
 await p.goto(origin);await p.getByRole('link',{name:'Mulai Sekarang',exact:true}).first().click();await expect(p.getByRole('heading',{name:'Mulai bersama Prospecto'})).toBeVisible();checks.push('Landing login and signup buttons reach real Auth without visual changes');
 for(let i=0;i<2;i++){
  await post(i,'/auth/action',{action:'signup',...users[i]});
  const session=must(await clients[i].auth.signInWithPassword(users[i]));ids.push(session.user.id);
  const page=await contexts[i].newPage();await page.goto(origin+'/app');await expect(page.getByRole('heading',{name:'Buat workspace',exact:true})).toBeVisible();
  await post(i,'/api/command',{action:'workspace.create',name:'Isolated V8 foundation '+i});workspaces.push(must(await clients[i].from('workspaces').select('id').single()).id);
  expect(must(await clients[i].from('products').select('*'))).toEqual([]);expect(must(await clients[i].from('contacts').select('*'))).toEqual([]);
  await post(i,'/api/command',{action:'product.save',workspace_id:workspaces[i],values:{name:'Isolated persistence test '+i}});
 }
 checks.push('Two actual new signups receive sessions immediately without email verification; new tenants start empty');
 const product=must(await clients[0].from('products').select('id').single());
 expect(must(await clients[1].from('products').select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 expect((await clients[1].from('products').insert({workspace_id:workspaces[0],name:'Denied'})).error).toBeTruthy();
 expect(must(await clients[1].from('products').update({name:'Denied'}).eq('id',product.id).select())).toEqual([]);
 const denied=await contexts[1].request.post(origin+'/api/command',{headers:{origin},data:{action:'workspace.switch',workspace_id:workspaces[0]}});expect(denied.status()).toBe(403);
 checks.push('Direct database read/insert/update and application workspace-switch attempts across tenants denied');
 await p.goto(origin+'/app');await p.getByRole('button',{name:'My Products',exact:true}).click();await expect(p.getByRole('heading',{name:'Isolated persistence test 0',exact:true})).toBeVisible();await p.reload();await p.getByRole('button',{name:'My Products',exact:true}).click();await expect(p.getByRole('heading',{name:'Isolated persistence test 0',exact:true})).toBeVisible();checks.push('Authenticated UI and reload preserve actual tenant data');
 await p.screenshot({path:'qa/v8-phase1/connected-products.png',fullPage:true});
 for(let i=0;i<2;i++){
  for(const product of must(await clients[i].from('products').select('id')))await post(i,'/api/command',{action:'product.delete',workspace_id:workspaces[i],id:product.id});
  await post(i,'/auth/action',{action:'logout'});await clients[i].auth.signOut({scope:'global'});
 }
 await p.goto(origin+'/app');await expect(p.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();
 await post(0,'/auth/action',{action:'login',...users[0]});await p.goto(origin+'/app');await expect(p.getByRole('heading',{name:'Welcome to Prospecto'})).toBeVisible();await post(0,'/auth/action',{action:'logout'});
 checks.push('Workspace content cleanup, logout session gate and subsequent password login pass');
 console.log('PASS: V8 Phase 1 foundation, landing Auth routing and real auto-confirm signup');
}finally{
 await browser.close();await writeFile('qa/v8-phase1/results.json',JSON.stringify({checks,userIds:ids,workspaceIds:workspaces,passed:checks.length===5,cleanup:'Product content deleted and sessions signed out; disable isolated QA identities separately.'},null,2));
}
