import {chromium,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
process.loadEnvFile('.env.local');
const origin='http://127.0.0.1:3000',admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}}),browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({reducedMotion:'reduce'});
const login={email:'prospecto-presentation-'+randomUUID()+'@example.com',password:randomBytes(32).toString('base64url')};
const created=await admin.auth.admin.createUser({...login,email_confirm:true});if(created.error)throw Error('QA user unavailable');const user=created.data.user;const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});await client.auth.signInWithPassword(login);
const errors:string[]=[],captures:unknown[]=[];let passed=false;
try{
 const r=await context.request.post(origin+'/auth/action',{headers:{origin},data:{action:'login',...login}});expect(r.status()).toBe(200);
 const w=randomUUID();expect((await client.from('workspaces').insert({id:w,name:'Isolated responsive QA',created_by:user.id})).error).toBeNull();
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/app');
 for(const width of [1440,1024,390,320]){
  await page.setViewportSize({width,height:900});
  for(const section of ['My Products','Campaigns','Settings','Subscription & Credits']){
   const menu=page.getByRole('button',{name:'Buka navigasi',exact:true});if(await menu.isVisible())await menu.click();
   await page.locator('.side-nav button').filter({hasText:section}).click();
   if(await menu.isVisible())await expect.poll(()=>page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const path=`qa/presentation/responsive-${section.replaceAll(' ','-').replaceAll('&','and')}-${width}.png`;await page.screenshot({path,fullPage:true,animations:'disabled'});captures.push({width,section,path});
  }
  await page.getByRole('button',{name:'Ask LEO'}).click();await expect(page.getByRole('dialog',{name:'LEO'})).toBeVisible();await expect(page.getByRole('button',{name:'Buat dengan GPT'})).toBeDisabled();await page.getByRole('button',{name:'Tutup LEO'}).click();
 }
 expect(errors).toEqual([]);passed=true;
}finally{await client.auth.signOut({scope:'global'});await admin.auth.admin.updateUserById(user.id,{ban_duration:'876000h'});await writeFile('qa/presentation/responsive-results.json',JSON.stringify({passed,captures,errors},null,2));await browser.close();console.log(JSON.stringify({passed,captures:captures.length,errors}));}
