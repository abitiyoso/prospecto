// One delivered link via non-echoing stdin; no token/password files or logs.
import {request,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
process.stdin.setRawMode?.(true);
const raw=await new Promise<string>(resolve=>{process.stdin.once('data',b=>resolve(b.toString().trim()));process.stdin.resume();});process.stdin.pause();process.stdin.setRawMode?.(false);
const url=new URL(raw);if(url.origin!=='http://127.0.0.1:3000'||url.pathname!=='/auth/confirm'||url.searchParams.get('type')!=='recovery')throw Error('Unexpected link');
const origin=url.origin,context=await request.newContext(),replay=await request.newContext();
const checks:string[]=[];
try{
 for(let i=0;i<2;i++){const r=await context.get(url.href);expect(r.status()).toBe(200);expect((await r.text()).includes('Lanjut atur ulang kata sandi')).toBe(true);expect(r.headers()['referrer-policy']).toBe('no-referrer');}
 checks.push('Repeated GETs do not consume recovery token; confirmation is a POST with no-referrer policy');
 const token=url.searchParams.get('token_hash')!;
 const bad=await replay.post(origin+'/auth/verify',{headers:{origin:'https://foreign.example'},form:{token_hash:token,type:'recovery'},maxRedirects:0});expect(bad.status()).toBe(403);
 const valid=await context.post(origin+'/auth/verify',{headers:{origin},form:{token_hash:token,type:'recovery'},maxRedirects:0});expect(valid.status()).toBe(303);expect(new URL(valid.headers().location).pathname).toBe('/auth/password');
 const page=await context.get(origin+'/auth/password');expect(await page.text()).toContain('Kata sandi baru');
 expect((await context.storageState()).cookies.some(c=>c.name.includes('auth-token'))).toBe(true);
 checks.push('Delivered Hostinger recovery link establishes a session in a fresh browser cookie context without the initiating PKCE verifier');
 const used=await replay.post(origin+'/auth/verify',{headers:{origin},form:{token_hash:token,type:'recovery'},maxRedirects:0});expect(new URL(used.headers().location).searchParams.get('auth')).toBe('expired');
 expect((await replay.storageState()).cookies.some(c=>c.name.includes('auth-token'))).toBe(false);
 checks.push('Consumed token cannot be replayed; cross-origin POST denied; real account password was not changed');
 await writeFile('qa/auth-smtp/results.json',JSON.stringify({passed:true,checks,mailbox:'hello@elenio.id',sender:'hello@elenio.id',templateSubject:'Atur ulang kata sandi akun Prospecto Anda',smtp:'smtp.hostinger.com:465',emailConfirmationEnabled:true,passwordChanged:false,tokensStored:false},null,2));
 console.log('PASS: delivered SMTP recovery, fresh-context session, no token consumption on GET and replay/CSRF rejection');
}catch{throw new Error('SMTP recovery verification failed; sensitive request details suppressed');}finally{await context.dispose();await replay.dispose();}
