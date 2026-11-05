import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:3188';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3188'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'}});
let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
try{
 let response;for(let i=0;i<30;i++){try{response=await fetch(origin+'/app');if(response.ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}assert.equal(response?.status,200);
 const html=await response.text();assert.match(html,/Prospecto/);assert.match(html,/Masuk ke workspace|Koneksi workspace belum tersedia/);assert.doesNotMatch(html,/PT Maju Bersama|188 credits/);
 assert.equal(response.headers.get('x-frame-options'),'DENY');assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 for(const route of ['/qa-visual','/__visual'])assert.equal((await fetch(origin+route)).status,404);
 for(const route of ['/api/command','/auth/action','/api/upload'])assert.equal((await fetch(origin+route,{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:'{}'})).status,403);
 const message='PASS: production HTTP 200, unauthenticated session gate, no reference tenant fixtures, security headers, QA routes 404, three CSRF boundaries. Provider E2E evidence is recorded separately in live-results.json.\n';
 await writeFile('qa/phase1/production-smoke.txt',message);console.log(message);
}finally{server.kill();}


