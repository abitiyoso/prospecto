import {z} from 'zod';
import type {LeoDraft} from './workflow-types';
export type AIProvider='openai'|'9router';
export class AIProviderError extends Error {
 constructor(public code:string,message:string,public status=502){super(message);this.name='AIProviderError';}
}
export type AIConfig={provider:AIProvider;baseURL:string;apiKey:string;model:string;effort?:string};
export function aiConfig(env:Record<string,string|undefined>):AIConfig{
 const provider=env.AI_PROVIDER||'openai';
 if(provider!=='openai'&&provider!=='9router')throw new AIProviderError('ai_not_configured','Layanan AI belum dikonfigurasi.',503);
 const apiKey=provider==='9router'?env.NINE_ROUTER_API_KEY:env.OPENAI_API_KEY,model=provider==='9router'?env.NINE_ROUTER_MODEL:env.OPENAI_MODEL;
 if(!apiKey?.trim()||!model?.trim())throw new AIProviderError('ai_not_configured','Layanan AI belum terhubung. Draft template masih tersedia.',503);
 let baseURL='https://api.openai.com/v1';
 if(provider==='9router'){
  try{const u=new URL(env.NINE_ROUTER_BASE_URL||'http://127.0.0.1:20128/v1');
   const loopback=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
   if((u.protocol!=='https:'&&!(u.protocol==='http:'&&loopback))||u.username||u.password||u.search||u.hash)throw Error();baseURL=u.href.replace(/\/$/,'');
  }catch{throw new AIProviderError('ai_not_configured','Alamat layanan AI belum valid.',503);}
 }
 const effort=env.AI_REASONING_EFFORT||env.OPENAI_REASONING_EFFORT;
 if(effort&&!['none','minimal','low','medium','high','xhigh','max'].includes(effort))throw new AIProviderError('ai_not_configured','Pengaturan penalaran AI belum valid.',503);
 return {provider,baseURL,apiKey:apiKey.trim(),model:model.trim(),effort};
}
export const draftSchema=(ids:string[])=>({type:'object',properties:{subject:{type:'string'},body:{type:'string'},rationale:{type:'string'},source_ids:{type:'array',items:{type:'string',enum:ids}}},required:['subject','body','rationale','source_ids'],additionalProperties:false});
export function providerFailure(status:number,body:unknown){
 const e=(body as {error?:{code?:string;type?:string}})?.error,code=typeof e?.code==='string'?e.code:'',type=typeof e?.type==='string'?e.type:'';
 if(['credit_balance_exhausted','insufficient_quota','usage_limit_exceeded'].includes(code)||type==='insufficient_quota')return new AIProviderError('ai_quota_exhausted','Kuota layanan AI belum aktif atau sudah habis. Pengelola perlu memeriksa kuota provider; draft template masih tersedia.',503);
 if(/spend_limit|usage_limit/.test(code))return new AIProviderError('ai_budget_reached','Batas penggunaan layanan AI tercapai. Hubungi pengelola workspace.',503);
 if(status===401||status===403)return new AIProviderError('ai_credentials_rejected','Koneksi layanan AI belum diizinkan. Hubungi pengelola workspace.',503);
 if(status===429)return new AIProviderError('ai_rate_limited','Layanan AI sedang membatasi permintaan. Tunggu sebentar sebelum mencoba lagi.',429);
 if(status===404||code==='model_not_found')return new AIProviderError('ai_model_unavailable','Model AI belum tersedia pada koneksi ini. Hubungi pengelola workspace.',503);
 return new AIProviderError('ai_provider_unavailable','Layanan AI belum dapat menghasilkan draft. Coba lagi nanti.');
}
export function parseDraft(provider:AIProvider,body:any,allowedIds:string[]):{draft:LeoDraft;model:string}{
 let content:string;
 if(provider==='9router'){
  const choice=body?.choices?.[0];if(choice?.message?.refusal)throw new AIProviderError('ai_refused','AI tidak dapat memenuhi arahan ini. Sesuaikan arahan draft.',422);
  if(choice?.finish_reason!=='stop')throw new AIProviderError('ai_incomplete','Jawaban AI belum lengkap. Coba dengan arahan yang lebih singkat.');
  content=choice.message?.content;
 }else{
  if(body?.status!=='completed')throw new AIProviderError('ai_incomplete','Jawaban AI belum lengkap. Coba dengan arahan yang lebih singkat.');
  const parts=(Array.isArray(body.output)?body.output:[]).flatMap((m:any)=>Array.isArray(m?.content)?m.content:[]);if(parts.some((p:any)=>p?.type==='refusal'))throw new AIProviderError('ai_refused','AI tidak dapat memenuhi arahan ini. Sesuaikan arahan draft.',422);
  content=parts.filter((p:any)=>p?.type==='output_text').map((p:any)=>p.text).join('');
 }
 try{
  const draft=z.object({subject:z.string().trim().min(1).max(300),body:z.string().trim().min(1).max(20000),rationale:z.string().max(2000),source_ids:z.array(z.string()).min(1).max(6)}).strict().parse(JSON.parse(content));
  if(draft.source_ids.some(id=>!allowedIds.includes(id))||/[\r\n]/.test(draft.subject))throw Error();
  const variables=(draft.subject+'\n'+draft.body).matchAll(/\{\{\s*([^}]+?)\s*\}\}/g);for(const m of variables)if(!['first_name','company','sender_name'].includes(m[1]))throw Error();
  return {draft,model:typeof body.model==='string'?body.model.slice(0,200):''};
 }catch{throw new AIProviderError('ai_invalid_draft','Draft AI belum sesuai format atau sumber produk. Coba ulang dengan arahan yang lebih jelas.');}
}
