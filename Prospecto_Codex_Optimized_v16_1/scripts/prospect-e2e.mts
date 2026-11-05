import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
process.loadEnvFile('.env.local');
const origin='http://127.0.0.1:3000';
const browser=await chromium.launch({channel:'chrome',headless:true});
const users=[0,1].map(()=>({email:'prospecto-phase2-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')}));
const clients=users.map(()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}}));
const contexts=await Promise.all(users.map(()=>browser.newContext()));const checks:string[]=[],ids:string[]=[],workspaces:string[]=[];
await mkdir('qa/v8-phase2',{recursive:true});
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Provider operation failed');return r.data as NonNullable<T>;};
async function post(i:number,endpoint:string,data:unknown){const r=await contexts[i].request.post(origin+endpoint,{headers:{origin},data});const body=await r.json();expect(r.status(),body.error).toBe(200);return body;}
try{
 const p=await contexts[0].newPage();await p.goto(origin);await p.getByRole('link',{name:'Masuk',exact:true}).click();await expect(p.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();
 await p.goto(origin);await p.getByRole('link',{name:'Mulai Sekarang',exact:true}).first().click();await expect(p.getByRole('heading',{name:'Mulai bersama Prospecto'})).toBeVisible();checks.push('Landing login and signup buttons reach real Auth without visual changes');
 for(let i=0;i<2;i++){
  await post(i,'/auth/action',{action:'signup',...users[i]});
  const session=must(await clients[i].auth.signInWithPassword(users[i]));ids.push(session.user.id);
  const page=await contexts[i].newPage();await page.goto(origin+'/app');await expect(page.getByRole('heading',{name:'Buat workspace',exact:true})).toBeVisible();
  await post(i,'/api/command',{action:'workspace.create',name:'Isolated V8 prospect '+i});workspaces.push(must(await clients[i].from('workspaces').select('id').single()).id);
  expect(must(await clients[i].from('products').select('*'))).toEqual([]);expect(must(await clients[i].from('contacts').select('*'))).toEqual([]);
  await post(i,'/api/command',{action:'product.save',workspace_id:workspaces[i],values:{name:'Isolated persistence test '+i}});
 }
 checks.push('Two actual new signups receive sessions immediately without email verification; new tenants start empty');
 await post(0,'/api/command',{action:'icp.save',workspace_id:workspaces[0],values:{product_id:must(await clients[0].from('products').select('id').single()).id,industry:'Manufacturing',location:'Jakarta',employee_min:50,employee_max:200}});
 await post(0,'/api/command',{action:'company.save',workspace_id:workspaces[0],values:{name:'Isolated QA company',domain:'phase2.example.com',industry:'Manufacturing',location:'Jakarta',employee_count:100,source_url:'https://example.com'}});
 const company=must(await clients[0].from('companies').select('*').single());
 const values={company_id:company.id,name:'Isolated QA PIC',email:'phase2-pic@example.com',title:'Operations Director',source_url:'https://example.com/team',confidence:'medium',verification:'candidate'};
 await post(0,'/api/command',{action:'pic.save',workspace_id:workspaces[0],values});const pic=must(await clients[0].from('pic_candidates').select('*').single());
 const unreviewed=await contexts[0].request.post(origin+'/api/command',{headers:{origin},data:{action:'pic.promote',workspace_id:workspaces[0],id:pic.id}});expect(unreviewed.status()).toBe(400);
 expect(must(await clients[1].from('pic_candidates').select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 expect((await clients[1].from('icp_profiles').insert({workspace_id:workspaces[1],product_id:must(await clients[0].from('products').select('id').single()).id})).error).toBeTruthy();
 checks.push('Persisted ICP/company/source metadata and foreign-tenant PIC/ICP isolation');
 await post(0,'/api/command',{action:'pic.save',workspace_id:workspaces[0],id:pic.id,values:{...values,verification:'verified'}});
 const promoted=await post(0,'/api/command',{action:'pic.promote',workspace_id:workspaces[0],id:pic.id});const repeated=await post(0,'/api/command',{action:'pic.promote',workspace_id:workspaces[0],id:pic.id});expect(promoted.id).toBe(repeated.id);
 const lead=must(await clients[0].from('contacts').select('*').single());expect(lead.source_url).toBe(values.source_url);expect(lead.company_id).toBe(company.id);expect(lead.verification).toBe('verified');
 checks.push('PIC cannot become a Lead before explicit manual verification; promotion preserves provenance and dedupes');
 await p.goto(origin+'/app');await p.getByRole('button',{name:'Find Prospects',exact:true}).click();await expect(p.getByText('Isolated QA company',{exact:true}).first()).toBeVisible();await expect(p.getByText('Isolated QA PIC',{exact:true})).toBeVisible();
 for(const [width,height]of [[1440,900],[1024,768],[390,844],[320,700]]){await p.setViewportSize({width,height});await p.screenshot({path:'qa/v8-phase2/check-'+width+'.png',fullPage:true});const offenders=await p.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,70)})));await writeFile('qa/v8-phase2/overflow-'+width+'.json',JSON.stringify(offenders,null,2));expect(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),JSON.stringify({width,offenders:offenders.slice(-8)})).toBe(false);await p.screenshot({path:'qa/v8-phase2/prospects-'+width+'.png',fullPage:true});}
 await p.setViewportSize({width:1440,height:900});
 checks.push('Live prospect UI renders saved company/PIC with no overflow at all four approved widths');
 for(const table of ['contacts','pic_candidates','companies'])must(await clients[0].from(table).delete().eq('workspace_id',workspaces[0]));
 const product=must(await clients[0].from('products').select('id').single());
 expect(must(await clients[1].from('products').select('*').eq('workspace_id',workspaces[0]))).toEqual([]);
 expect((await clients[1].from('products').insert({workspace_id:workspaces[0],name:'Denied'})).error).toBeTruthy();
 expect(must(await clients[1].from('products').update({name:'Denied'}).eq('id',product.id).select())).toEqual([]);
 const denied=await contexts[1].request.post(origin+'/api/command',{headers:{origin},data:{action:'workspace.switch',workspace_id:workspaces[0]}});expect(denied.status()).toBe(403);
 checks.push('Direct database read/insert/update and application workspace-switch attempts across tenants denied');
 await p.goto(origin+'/app');await p.getByRole('button',{name:'My Products',exact:true}).click();await expect(p.getByRole('heading',{name:'Isolated persistence test 0',exact:true})).toBeVisible();await p.reload();await p.getByRole('button',{name:'My Products',exact:true}).click();await expect(p.getByRole('heading',{name:'Isolated persistence test 0',exact:true})).toBeVisible();checks.push('Authenticated UI and reload preserve actual tenant data');
 await p.screenshot({path:'qa/v8-phase2/connected-products.png',fullPage:true});
 for(let i=0;i<2;i++){
  for(const product of must(await clients[i].from('products').select('id')))await post(i,'/api/command',{action:'product.delete',workspace_id:workspaces[i],id:product.id});
  await post(i,'/auth/action',{action:'logout'});await clients[i].auth.signOut({scope:'global'});
 }
 await p.goto(origin+'/app');await expect(p.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();
 await post(0,'/auth/action',{action:'login',...users[0]});await p.goto(origin+'/app');await expect(p.getByRole('heading',{name:'Welcome to Prospecto'})).toBeVisible();await post(0,'/auth/action',{action:'logout'});
 checks.push('Workspace content cleanup, logout session gate and subsequent password login pass');
 console.log('PASS: V8 Phase 2 prospect persistence, provenance, manual verification and tenant isolation');
}finally{
 for(let i=0;i<2;i++){if(workspaces[i]){for(const table of ['contacts','pic_candidates','companies','products'])await clients[i].from(table).delete().eq('workspace_id',workspaces[i]);}await clients[i].auth.signOut({scope:'global'});}
 await browser.close();await writeFile('qa/v8-phase2/results.json',JSON.stringify({checks,userIds:ids,workspaceIds:workspaces,passed:checks.length===8,cleanup:'Product content deleted and sessions signed out; disable isolated QA identities separately.'},null,2));
}



