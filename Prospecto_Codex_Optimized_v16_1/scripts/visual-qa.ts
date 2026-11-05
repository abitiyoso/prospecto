/** Isolated development harness. The temporary route is removed in finally and is
 * unreachable in production even while present. No QA identity enters auth/data. */
import { chromium, expect } from '@playwright/test';
import { mkdir,writeFile,rm,readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
const root=process.cwd(), port=3187, origin=`http://127.0.0.1:${port}`, route=path.join(root,'app','qa-visual');
const out=path.join(root,'qa','phase1');await mkdir(out,{recursive:true});await mkdir(route,{recursive:true});
const workspace={id:'11111111-1111-4111-8111-111111111111',name:'QA Workspace',role:'owner'};
const empty={active:workspace,workspaces:[workspace],products:[],sources:[],contacts:[],campaigns:[],email:'qa@example.test'};
const populated={...empty,products:[{id:'22222222-2222-4222-8222-222222222222',workspace_id:workspace.id,name:'QA Product',category:'Operations',industry:'Manufacturing',buyer_roles:'Operations Director',pain_points:'Reporting time',value_proposition:'Centralized operations',pricing_context:'Annual contract'}],contacts:[{id:'33333333-3333-4333-8333-333333333333',workspace_id:workspace.id,name:'QA Contact',email:'qa@example.test',title:'Operations Director',verification:'unverified',source_url:'',company_id:null}],sources:[],campaigns:[]};
await writeFile(path.join(route,'page.tsx'),`import {notFound} from 'next/navigation';import Dashboard from '../ui/dashboard';import type {DashboardData} from '@/lib/domain';export const dynamic='force-dynamic';export default async function Page({searchParams}:{searchParams:Promise<{filled?:string}>}){if(process.env.NODE_ENV!=='development'||process.env.PROSPECTO_VISUAL_QA!=='1')notFound();const p=await searchParams;return <Dashboard data={(p.filled?${JSON.stringify(populated)}:${JSON.stringify(empty)}) as DashboardData}/>;}`);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',PROSPECTO_VISUAL_QA:'1',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const results:unknown[]=[];
try{
 let ready=false;for(let i=0;i<90;i++){try{const r=await fetch(origin);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!ready)throw new Error('QA server unavailable: '+log.slice(-3000));
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [360,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(origin+'/qa-visual');await page.getByRole('heading',{name:'Welcome to Prospecto'}).waitFor();
  for(const name of ['Home','My Products','Find Prospects','Leads','Campaigns','Analytics','Subscription & Credits','Settings']){
   if(width<=1024&&await page.getByRole('button',{name:'Buka navigasi'}).isVisible())await page.getByRole('button',{name:'Buka navigasi'}).click();
   await page.getByRole('button',{name,exact:true}).click();await page.waitForTimeout(200);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   expect(overflow,`${name} overflow at ${width}px`).toBe(false);
   if([390,768,1440].includes(width))await page.screenshot({path:path.join(out,`${name.replaceAll(' ','_').replaceAll('&','and')}_${width}.png`),fullPage:true});
   results.push({surface:name,width,overflow:false});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/qa-visual');
 await page.getByRole('button',{name:'Buat produk pertama',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByLabel('Nama produk',{exact:true}).fill('QA created product');
 let productPayload:Record<string,any>|undefined;
 await page.route('**/api/command',async route=>{productPayload=route.request().postDataJSON();await route.fulfill({json:{ok:true}});});
 await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();expect(productPayload?.values.name).toBe('QA created product');
 await page.unroute('**/api/command');
 await page.goto(origin+'/qa-visual?filled=1');await page.getByRole('button',{name:/^Leads/}).click();await page.getByRole('checkbox',{name:'Pilih QA Contact'}).check();await page.getByRole('button',{name:'Buat campaign',exact:true}).click();await page.getByLabel('Nama campaign',{exact:true}).fill('QA draft');
 let audiencePayload:Record<string,any>|undefined;await page.route('**/api/command',async route=>{audiencePayload=route.request().postDataJSON();await route.fulfill({json:{id:'44444444-4444-4444-8444-444444444444'}});});await page.getByRole('button',{name:'Simpan',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();expect(audiencePayload?.values.contact_ids).toEqual([populated.contacts[0].id]);await page.unroute('**/api/command');
 await page.goto(origin+'/app');await expect(page.getByRole('button',{name:'Masuk',exact:true})).toBeDisabled();
 const csrf=await page.request.post(origin+'/api/command',{headers:{origin:'https://foreign.example'},data:{action:'workspace.create'}});expect(csrf.status()).toBe(403);
 const auth=await page.request.post(origin+'/auth/action',{headers:{origin:'https://foreign.example'},data:{action:'login'}});expect(auth.status()).toBe(403);
 const upload=await page.request.post(origin+'/api/upload',{headers:{origin:'https://foreign.example'}});expect(upload.status()).toBe(403);
 expect(errors).toEqual([]);
 const manifest=JSON.parse(await readFile('reference-ui/assets/manifest.json','utf8'));
 const {createHash}=await import('node:crypto');for(const asset of manifest.assets.filter((a:{name:string})=>a.name!=='prospecto-logo-approved.png')){const bytes=await readFile('public/assets/'+asset.name);expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);}
 await writeFile(path.join(out,'visual-results.json'),JSON.stringify({results,clientErrors:errors,checks:{productFormPayload:true,selectedAudiencePayload:true,unconfiguredLoginDisabled:true,csrfCommands:true,csrfAuth:true,csrfUpload:true,assetHashes:manifest.assets.length},limitations:['Browser command responses in isolated QA are intercepted. Actual persistence/RLS is tested separately in PGlite.','Supabase Auth and Storage HTTP services require a configured running project.']},null,2));
 console.log(`PASS: ${results.length} responsive surfaces; 24 screenshots; form/audience payloads; CSRF boundaries; ${manifest.assets.length} exact asset hashes.`);
}finally{await browser?.close();server.kill();await new Promise(r=>setTimeout(r,500));await rm(route,{recursive:true,force:true});const generated=path.resolve(root,'.next','dev','types');if(!generated.startsWith(root+path.sep))throw new Error('Invalid generated types path');await rm(generated,{recursive:true,force:true});await writeFile(path.join(out,'qa-server.log'),log);}




