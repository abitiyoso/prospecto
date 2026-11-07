import 'server-only';
import {generateAIDraft} from './leo-provider';
import {aiConfig,AIProviderError} from './leo-contract';
import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {adminDb} from './admin';
import {extractDocument,chunkText} from './documents';
import {publicEvidenceUrl} from './research';
import {platformSmtp,smtpTransport,allowedRecipient,smtpInput,type SmtpConfig,connectionTransport} from './smtp';
import {seal} from './server-crypto';
import type {LeoDraft} from './workflow-types';
type UserDb=Awaited<ReturnType<typeof import('./supabase').supabase>>;
export function must<T>(r:{data:T;error:unknown}):NonNullable<T>{if(r.error)throw new Error('Operasi data belum berhasil');return r.data as NonNullable<T>;}
export const presentationEligible=(email:string)=>process.env.PRESENTATION_MODE==='true'&&(process.env.PRESENTATION_OWNER_EMAIL||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
export async function presentationActive(db:ReturnType<typeof adminDb>,w:string){const r=await db.from('presentation_access').select('workspace_id').eq('workspace_id',w).gt('expires_at',new Date().toISOString()).maybeSingle();return !!r.data;}
export async function indexSource(db:UserDb,w:string,id:string,actor:string){
 const source=must(await db.from('knowledge_sources').select('*').eq('workspace_id',w).eq('id',id).single());const admin=adminDb();
 must(await admin.from('knowledge_documents').upsert({source_id:id,workspace_id:w,product_id:source.product_id,state:'indexing',error_code:'',text_content:'',chunks:[],updated_at:new Date().toISOString()}));
 try{
  let extracted:{text:string;chunks:string[]};
  if(source.kind==='note')extracted=chunkText(source.content);
  else if(source.kind==='url'){
   const url=publicEvidenceUrl(source.content);if(!url)throw new Error('URL tidak aman');if(!process.env.FIRECRAWL_API_KEY)throw new Error('Riset URL belum terhubung');must(await admin.rpc('reserve_provider_usage',{w,actor,k:'kms'}));
   const r=await fetch('https://api.firecrawl.dev/v2/scrape',{method:'POST',headers:{Authorization:'Bearer '+process.env.FIRECRAWL_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({url,formats:['markdown'],onlyMainContent:true,timeout:20000}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('Sumber URL belum dapat dibaca');const result=await r.json();if(result.success!==true||typeof result.data?.markdown!=='string')throw new Error('Sumber tidak mengandung teks');extracted=chunkText(result.data.markdown);
  }else{if(source.upload_state!=='stored'||!source.storage_path)throw new Error('File belum tersedia');const blob=must(await db.storage.from('product-kms').download(source.storage_path));extracted=await extractDocument(source.title,new Uint8Array(await blob.arrayBuffer()));}
  must(await admin.from('knowledge_documents').update({state:'ready',text_content:extracted.text,chunks:extracted.chunks,source_fingerprint:createHash('sha256').update(extracted.text).digest('hex'),updated_at:new Date().toISOString()}).eq('workspace_id',w).eq('source_id',id));return {characters:extracted.text.length,chunks:extracted.chunks.length};
 }catch(e){await admin.from('knowledge_documents').update({state:'failed',error_code:'Teks belum dapat diproses. Periksa format, panjang, atau ketersediaan URL.',updated_at:new Date().toISOString()}).eq('workspace_id',w).eq('source_id',id);throw e;}
}
export async function generateDraft(db:UserDb,w:string,p:string,actor:string,instruction:string,engine:'template'|'openai'|'ai'){
 const product=must(await db.from('products').select('*').eq('workspace_id',w).eq('id',p).single());const icp=(await db.from('icp_profiles').select('*').eq('workspace_id',w).eq('product_id',p).maybeSingle()).data;
 let refs=must(await db.rpc('search_knowledge',{w,p,q:instruction})) as {source_id:string;title:string;excerpt:string}[];if(!refs.length)refs=must(await db.rpc('search_knowledge',{w,p,q:''}));
 const sourceRefs=[{source_id:'product',title:'Profil produk: '+product.name,excerpt:[product.value_proposition,product.pain_points,product.pricing_context].filter(Boolean).join('\n')},...refs];let draft:LeoDraft,savedEngine:'template'|'openai'|'9router'='template',model='',requestedModel='';
 if(engine==='template')draft={subject:'Perkenalan '+product.name+' untuk {{company}}',body:`Halo {{first_name}},\n\nSaya ingin memperkenalkan ${product.name}.${product.value_proposition?' '+product.value_proposition:''}\n\nApakah tim {{company}} bersedia mendiskusikan kebutuhan Anda?\n\nSalam,\n{{sender_name}}`,rationale:'Draft template memakai profil produk yang tersimpan. Tinjau fakta dan sesuaikan pesan sebelum dikirim. Ini bukan hasil model AI.',source_ids:['product']};
 else{
  aiConfig(process.env);must(await adminDb().rpc('reserve_provider_usage',{w,actor,k:'leo'}));
  try{const generated=await generateAIDraft({instruction,product,icp,sources:sourceRefs});draft=generated.draft;savedEngine=generated.provider;model=generated.model;requestedModel=generated.requestedModel;}
  catch(e){if(e instanceof AIProviderError)await adminDb().from('operational_events').insert({workspace_id:w,kind:'leo_provider',error_code:e.code});throw e;}
 }
 const run=must(await adminDb().from('leo_runs').insert({workspace_id:w,product_id:p,engine:savedEngine,model,requested_model:requestedModel,instruction,result:draft,source_refs:sourceRefs.filter(s=>draft.source_ids.includes(s.source_id)),created_by:actor}).select('*').single());return {run};
}
export async function saveSender(w:string,actor:string,values:unknown){
 const config=smtpInput.parse(values);const transport=await smtpTransport(config);try{await transport.verify();}catch{throw new Error('Login SMTP belum berhasil. Periksa host, akun, dan password.');}finally{transport.close();}
 const admin=adminDb();const existing=(await admin.from('channel_connections').select('id').eq('workspace_id',w).maybeSingle()).data;const id=existing?.id||crypto.randomUUID();
 if(existing)must(await admin.from('campaign_launches').update({state:'paused'}).eq('workspace_id',w).in('state',['queued','active']));
 must(await admin.from('channel_connections').upsert({id,workspace_id:w,sender_email:config.from.toLowerCase(),sender_name:config.name,status:'verified',verified_at:new Date().toISOString(),created_by:actor},{onConflict:'workspace_id'}));must(await admin.from('smtp_credentials').upsert({connection_id:id,ciphertext:seal(config)}));return {id};
}
export async function sendTest(w:string,email:string,actor:string){if(!allowedRecipient(email))throw new Error('Pada preview lokal, pengiriman hanya ke alamat uji yang diizinkan server');const db=adminDb();must(await db.rpc('reserve_provider_usage',{w,actor,k:'smtp_test'}));const channel=must(await db.from('channel_connections').select('id').eq('workspace_id',w).eq('status','verified').single());const {transport,config}=await connectionTransport(db,channel.id);try{const r=await transport.sendMail({from:{name:config.name,address:config.from},to:email,subject:'Koneksi email Prospecto berhasil',text:'Email ini mengonfirmasi bahwa koneksi SMTP workspace Prospecto berhasil diuji. Tidak ada campaign yang dijalankan.'});if(!r.accepted?.length)throw new Error('Email uji belum diterima SMTP');return {accepted:true};}finally{transport.close();}}
export async function createInvite(w:string,actor:string,email:string,send:boolean){
 const db=adminDb(),token=randomBytes(32).toString('hex');const emailAddress=z.email().parse(email.trim().toLowerCase());if(send&&!allowedRecipient(emailAddress))throw new Error('Pada preview lokal, gunakan salin tautan untuk penerima di luar alamat uji');
 const row=must(await db.from('workspace_invites').upsert({workspace_id:w,email:emailAddress,token_hash:createHash('sha256').update(token).digest('hex'),created_by:actor,expires_at:new Date(Date.now()+7*86400000).toISOString(),accepted_by:null,accepted_at:null,revoked_at:null},{onConflict:'workspace_id,email'}).select('id').single());const link=(process.env.APP_BASE_URL||'http://127.0.0.1:3000')+'/invite?token='+token;
 if(send){must(await db.rpc('reserve_provider_usage',{w,actor,k:'invite'}));const config=platformSmtp(),transport=await smtpTransport(config);try{const r=await transport.sendMail({from:{name:config.name,address:config.from},to:emailAddress,subject:'Undangan workspace Prospecto',text:`Anda diundang bergabung ke workspace Prospecto sebagai member.\n\nMasuk atau daftar memakai ${emailAddress}, lalu buka tautan ini:\n${link}\n\nTautan berlaku 7 hari. Abaikan jika undangan ini tidak Anda kenali.`});if(!r.accepted?.length)throw new Error('Email undangan belum diterima SMTP');}finally{transport.close();}}
 return {id:row.id,link,sent:send};
}
