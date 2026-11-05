import{execFileSync}from'node:child_process';
import{readFileSync}from'node:fs';
const paths=execFileSync('git',['diff','--cached','--name-only','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const env=readFileSync('Prospecto_Codex_Optimized_v16_1/.env.local','utf8');
const secrets=env.split(/\r?\n/).filter(l=>/^(FIRECRAWL_API_KEY|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY)=/.test(l)).map(l=>l.slice(l.indexOf('=')+1)).filter(Boolean);
const unsafe=[];for(const p of paths){if(/(^|\/)(node_modules|\.next)\/|\.zip$|(^|\/)\.env(?!\.example$)/.test(p)){unsafe.push(p);continue;}const bytes=execFileSync('git',['show',':'+p],{maxBuffer:20*1024*1024});if(secrets.some(s=>bytes.includes(Buffer.from(s)))||/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|sb_secret_[A-Za-z0-9_-]{20,})\b/.test(bytes.toString('utf8')))unsafe.push(p);}
if(unsafe.length){console.error('Refusing commit: review secret/generated files: '+unsafe.join(', '));process.exit(1);}
console.log(`PASS: ${paths.length} staged files checked; no configured server secret, credential file, dependency tree, build output or ZIP archive.`);
