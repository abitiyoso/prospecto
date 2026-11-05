import {createClient} from '@supabase/supabase-js';
import {writeFile} from 'node:fs/promises';
process.loadEnvFile('.env.local');process.stdin.setRawMode?.(true);process.stdin.resume();console.log('Ready for isolated QA credentials on stdin (hidden)');
const input=await new Promise<string>(resolve=>{let value='';const read=(b:Buffer)=>{value+=b.toString();if(/[\r\n]/.test(value)){process.stdin.off('data',read);resolve(value.trim());}};process.stdin.on('data',read);});process.stdin.setRawMode?.(false);process.stdin.pause();
const check=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('QA cleanup operation failed');return r.data as NonNullable<T>;};
let count=0;
for(const user of JSON.parse(input)){
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 const signed=check(await db.auth.signInWithPassword(user));
 try{
  const workspaces=check(await db.from('workspaces').select('id,name').eq('created_by',signed.user.id));
  for(const w of workspaces){
   if(!w.name.startsWith('Isolated'))throw new Error('Refusing non-QA workspace');
   const sources=check(await db.from('knowledge_sources').select('storage_path').eq('workspace_id',w.id));const paths=sources.map(s=>s.storage_path).filter(Boolean);if(paths.length)check(await db.storage.from('product-kms').remove(paths));
   for(const table of ['campaign_audience','campaigns','contacts','companies','knowledge_sources','products'])check(await db.from(table).delete().eq('workspace_id',w.id));
   count++;
  }
 }finally{await db.auth.signOut({scope:'global'});}
}
await writeFile('qa/phase1/live-cleanup.json',JSON.stringify({workspacesEmptied:count,remaining:'Empty isolated QA workspace metadata and append-only audit history only; QA identities must be disabled separately.'},null,2));console.log('PASS: emptied '+count+' isolated QA workspaces through authenticated RLS-scoped APIs');
