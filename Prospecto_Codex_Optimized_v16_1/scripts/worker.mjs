import {loadEnvFile} from 'node:process';
try{loadEnvFile('.env.local');}catch{}
const base=process.env.APP_BASE_URL,secret=process.env.WORKER_SECRET;
if(!base||!secret)throw new Error('APP_BASE_URL dan WORKER_SECRET diperlukan');
let stopped=false;process.once('SIGINT',()=>stopped=true);process.once('SIGTERM',()=>stopped=true);
const check=process.argv.includes('--check');
async function tick(){try{const r=await fetch(new URL('/api/worker'+(check?'?check=1':''),base),{method:'POST',headers:{Authorization:'Bearer '+secret},signal:AbortSignal.timeout(60000)});if(!r.ok){console.error('Worker HTTP',r.status);process.exitCode=1;return;}const v=await r.json();console.log(new Date().toISOString(),JSON.stringify(v));}catch{console.error('Worker belum dapat menghubungi aplikasi');process.exitCode=1;}}
do{await tick();if(check||process.argv.includes('--once')||stopped)break;await new Promise(resolve=>{const quit=()=>{clearTimeout(timer);process.off('SIGINT',quit);process.off('SIGTERM',quit);resolve();};const timer=setTimeout(quit,30000);process.once('SIGINT',quit);process.once('SIGTERM',quit);});}while(!stopped);
