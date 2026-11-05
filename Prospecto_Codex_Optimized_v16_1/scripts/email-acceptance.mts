// Tests actual mailbox-delivered links. Tokens/passwords stay in process memory.
import {chromium,expect} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
async function hiddenInput(){process.stdin.setRawMode?.(true);process.stdin.resume();const value=await new Promise<string>(resolve=>{let raw='';const listener=(b:Buffer)=>{raw+=b.toString();if(/[\r\n]/.test(raw)){process.stdin.off('data',listener);resolve(raw.trim());}};process.stdin.on('data',listener);});process.stdin.setRawMode?.(false);process.stdin.pause();return value;}
function verifiedLink(raw:string,type:string){const url=new URL(raw);if(url.origin!=='https://qmuwqwzmezbatvatawur.supabase.co'||url.pathname!=='/auth/v1/verify'||url.searchParams.get('type')!==type)throw new Error('Unexpected Auth link');return url;}
const origin='http://127.0.0.1:3000';const results:Record<string,unknown>={};
console.log('Ready for confirmation link on hidden stdin');
const confirm=verifiedLink(await hiddenInput(),'signup');
const response=await fetch(confirm,{redirect:'manual'});expect([302,303]).toContain(response.status);
const location=new URL(response.headers.get('location')!);expect(location.hash).not.toContain('error');expect(location.searchParams.has('error')).toBe(false);results.confirmationEmailLinkAccepted=true;
const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext();const page=await context.newPage();
try{
 await page.goto(origin+'/app');
 const request=await context.request.post(origin+'/auth/action',{headers:{origin},data:{action:'reset',email:'hello@elenio.id'}});expect(request.status(),await request.text()).toBe(200);results.appRecoveryRequested=true;
 console.log('Ready for recovery email link on hidden stdin');
 const recovery=verifiedLink(await hiddenInput(),'recovery');await page.goto(recovery.href);await page.waitForURL('**/auth/password',{timeout:30000});
 await expect(page.getByRole('heading',{name:'Kata sandi baru'})).toBeVisible();results.recoveryCallbackAndSession=true;
 const password=randomBytes(32).toString('base64url');await page.getByLabel('Kata sandi',{exact:true}).fill(password);await page.getByRole('button',{name:'Simpan kata sandi',exact:true}).click();await expect(page.getByRole('status')).toContainText('Kata sandi diperbarui');
 const login=await context.request.post(origin+'/auth/action',{headers:{origin},data:{action:'login',email:'hello@elenio.id',password}});expect(login.status(),await login.text()).toBe(200);
 await page.goto(origin+'/app');await expect(page.getByRole('heading',{name:'Buat workspace',exact:true})).toBeVisible();results.passwordResetAndLogin=true;results.emptyWorkspaceOnboarding=true;
 await page.screenshot({path:'qa/phase1/email-onboarding.png',fullPage:true});
 await context.request.post(origin+'/auth/action',{headers:{origin},data:{action:'logout'}});results.loggedOut=true;
 console.log('PASS: confirmation delivery/verification, app recovery request, real email callback, password reset, login and empty onboarding');
}finally{await browser.close();await writeFile('qa/phase1/email-results.json',JSON.stringify({results,passed:Object.keys(results).length===6,account:'hello@elenio.id',passwordStored:false},null,2));}

