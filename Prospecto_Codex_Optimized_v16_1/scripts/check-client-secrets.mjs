import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
try{process.loadEnvFile('.env.local');}catch{}
const keys=['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','SMTP_PASS','OPENAI_API_KEY','NINE_ROUTER_API_KEY','FIRECRAWL_API_KEY','PROSPECTO_ENCRYPTION_KEY','WORKER_SECRET'];
const secrets=keys.map(k=>process.env[k]).filter(Boolean);let assets=0;
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await scan(file);else if(/\.(js|map|html)$/.test(file)){assets++;const bytes=await readFile(file);if(secrets.some(s=>bytes.includes(Buffer.from(s))))throw new Error('Server credential found in browser asset: '+file);}}}
await scan('.next/static');
const result={passed:true,browserAssets:assets,configuredSecretsChecked:secrets.length};
const dir=process.env.QA_OUTPUT_DIR||'qa/presentation';await mkdir(dir,{recursive:true});
await writeFile(dir+'/client-secrets.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
