import {loadEnvFile} from 'node:process';
import {z} from 'zod';
import {aiConfig} from '../lib/leo-contract';
import {applicationOrigin,isLoopback} from '../lib/delivery-policy';
import {platformSmtp,smtpTransport} from '../lib/smtp';

try{loadEnvFile('.env.local');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw Error('Environment file could not be read');}

const env=process.env,local=process.argv.includes('--local'),base=applicationOrigin(env.APP_BASE_URL);
const mode=env.SMTP_DELIVERY_MODE||'allowlist',invalid:string[]=[];
if(process.versions.node.split('.')[0]!=='24')invalid.push('Node.js 24');
if(!base||(local?!isLoopback(base.hostname):base.protocol!=='https:'||isLoopback(base.hostname)))invalid.push(local?'APP_BASE_URL must be a loopback origin':'APP_BASE_URL must be the final HTTPS origin');
if(!['allowlist','live'].includes(mode)||local&&mode==='live')invalid.push('SMTP_DELIVERY_MODE');
if(mode==='allowlist'&&!z.array(z.email()).min(1).safeParse((env.SMTP_PRESENTATION_RECIPIENTS||'').split(',').map(s=>s.trim()).filter(Boolean)).success)invalid.push('SMTP_PRESENTATION_RECIPIENTS');
if(env.PRESENTATION_MODE==='true'&&!z.array(z.email()).min(1).safeParse((env.PRESENTATION_OWNER_EMAIL||'').split(',').map(s=>s.trim()).filter(Boolean)).success)invalid.push('PRESENTATION_OWNER_EMAIL');
const supabase=applicationOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
if(!supabase||supabase.protocol!=='https:'&&!(local&&isLoopback(supabase.hostname)))invalid.push('NEXT_PUBLIC_SUPABASE_URL');
for(const key of ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','FIRECRAWL_API_KEY'] as const)if(!env[key]?.trim())invalid.push(key);
if(!/^[a-f0-9]{64}$/i.test(env.PROSPECTO_ENCRYPTION_KEY||''))invalid.push('PROSPECTO_ENCRYPTION_KEY (64 hex characters)');
if((env.WORKER_SECRET||'').trim().length<32||env.WORKER_SECRET!==env.WORKER_SECRET?.trim()||env.WORKER_SECRET===env.PROSPECTO_ENCRYPTION_KEY)invalid.push('WORKER_SECRET (separate value, at least 32 characters)');
let ai:ReturnType<typeof aiConfig>|undefined,smtp:ReturnType<typeof platformSmtp>|undefined;
try{ai=aiConfig(env);}catch{invalid.push('AI provider URL, model and credential');}
try{smtp=platformSmtp();}catch{invalid.push('SMTP host, port, matching user/from and credential');}
if(invalid.length||!base||!supabase||!ai||!smtp){for(const key of invalid)console.error('FAIL config: '+key);process.exit(1);}

const request=(url:string|URL,init:RequestInit={})=>fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(12000)});
const status=(r:Response,n:number)=>{if(r.status!==n)throw Error('unexpected status');};
const worker=new URL('/api/worker?check=1',base),command=new URL('/api/command',base);
const aiConnection=ai,smtpConnection=smtp;
const checks:[string,()=>Promise<void>][]=[
 ['HTTPS origin / app and database health',async()=>{const [app,health]=await Promise.all([request(new URL('/app',base)),request(new URL('/api/health',base))]);status(app,200);status(health,200);if(!(await app.text()).includes('Masuk ke workspace')||(await health.json()).ok!==true)throw Error('wrong app');}],
 ['Proxy preserves same origin; foreign origin denied',async()=>{const post=(origin:string)=>request(command,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:'{}'});const [same,foreign]=await Promise.all([post(base.origin),post('https://foreign.invalid')]);status(same,401);status(foreign,403);}],
 ['Worker authentication and dry check (no queue processed)',async()=>{const post=(headers:HeadersInit={})=>request(worker,{method:'POST',headers});const [denied,dry]=await Promise.all([post(),post({Authorization:'Bearer '+env.WORKER_SECRET})]);status(denied,401);status(dry,200);const v=await dry.json();if(v.ok!==true||v.queueProcessed!==false)throw Error('wrong worker response');}],
 ['Supabase Auth settings endpoint',async()=>{const r=await request(new URL('/auth/v1/settings',supabase),{headers:{apikey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!}});status(r,200);}],
 ['AI provider lists configured model (no generation)',async()=>{const r=await request(aiConnection.baseURL+'/models',{headers:{Authorization:'Bearer '+aiConnection.apiKey}});status(r,200);const v=await r.json();if(!Array.isArray(v.data)||!v.data.some((m:{id?:string})=>m?.id===aiConnection.model))throw Error('model not listed');}],
 ['Firecrawl account has research credits (no search)',async()=>{const r=await request('https://api.firecrawl.dev/v2/team/credit-usage',{headers:{Authorization:'Bearer '+env.FIRECRAWL_API_KEY}});status(r,200);const v=await r.json();if(v.success!==true||!(v.data?.remainingCredits>0))throw Error('research unavailable');}],
 ['Platform SMTP TLS and login (no email sent)',async()=>{const transport=await smtpTransport(smtpConnection);try{await transport.verify();}finally{transport.close();}}],
];
const results=await Promise.allSettled(checks.map(([,run])=>run()));
console.log('Configuration: '+(local?'local preview':'production HTTPS')+'; SMTP mode: '+mode);
for(const [i,r] of results.entries())console.log((r.status==='fulfilled'?'PASS ':'FAIL ')+checks[i][0]);
if(results.some(r=>r.status==='rejected'))process.exitCode=1;
