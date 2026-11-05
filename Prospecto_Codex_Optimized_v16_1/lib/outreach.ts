import { z } from 'zod';
import type { Contact } from './domain';
export const stepInput=z.object({kind:z.enum(['email','wait','linkedin_manual','condition']),subject:z.string().max(300).default(''),body:z.string().max(20000).default(''),days:z.number().int().min(1).max(365).default(3),condition:z.enum(['replied','not_replied']).optional(),then_step:z.number().int().min(1).max(12).nullable().optional(),else_step:z.number().int().min(1).max(12).nullable().optional()});
export const stepsInput=z.array(stepInput).min(1).max(12).superRefine((steps,ctx)=>{steps.forEach((s,i)=>{if(s.kind==='condition'&&(!s.condition||s.then_step===undefined||s.else_step===undefined||[s.then_step,s.else_step].some(n=>n!=null&&(n<=i+1||n>steps.length))))ctx.addIssue({code:'custom',path:[i],message:'Cabang harus menuju langkah setelah kondisi atau berhenti.'});});});
export type CampaignStep=z.infer<typeof stepInput>;
export const outreachInput=z.object({name:z.string().trim().min(1).max(160),product_id:z.string().uuid().nullable(),sender_name:z.string().trim().max(160),steps:stepsInput});
export const templateInput=z.object({name:z.string().trim().min(1).max(160),steps:stepsInput});
export type CampaignTemplate=z.infer<typeof templateInput>&{id:string};
export const defaultSteps:CampaignStep[]=[
 {kind:'email',subject:'Perkenalan untuk {{company}}',body:'Halo {{first_name}},\n\nSaya ingin mendiskusikan kebutuhan tim Anda.\n\nSalam,\n{{sender_name}}',days:3},
 {kind:'wait',subject:'',body:'',days:3},
 {kind:'linkedin_manual',subject:'',body:'Tinjau profil bisnis dan kirim permintaan koneksi secara manual bila sesuai.',days:3},
 {kind:'email',subject:'Menindaklanjuti percakapan',body:'Halo {{first_name}},\n\nApakah Anda bersedia mendiskusikan kebutuhan {{company}}?\n\nSalam,\n{{sender_name}}',days:3}
];
export const variables=['first_name','company','sender_name'] as const;
// Postgres JSONB can return object keys in a different order after a save.
export function canonicalJSON(value:unknown):string{return JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);}
export function personalize(text:string,contact:Contact|undefined,sender:string){
 const values:Record<string,string>={first_name:contact?.name.trim().split(/\s+/)[0]||'',company:contact?.company_name||contact?.companies?.name||'',sender_name:sender};
 const unresolved:string[]=[];
 const rendered=text.replace(/{{\s*([^{}]+?)\s*}}/g,(raw,key:string)=>{if(!variables.includes(key as typeof variables[number])||!values[key]){unresolved.push(key);return raw;}return values[key];});
 if(rendered.includes('{{')||rendered.includes('}}'))unresolved.push('variabel belum terselesaikan');
 return {text:rendered,unresolved:[...new Set(unresolved)]};
}
export function contentIssues(steps:CampaignStep[],contacts:Contact[],sender:string,productId:string|null){
 const issues:string[]=[];
 if(!stepsInput.safeParse(steps).success)issues.push('Periksa urutan, jeda, dan tujuan cabang.');
 if(!productId)issues.push('Pilih produk.');
 if(!contacts.length)issues.push('Pilih audience.');
 if(contacts.some(c=>c.verification!=='verified'||!c.source_url))issues.push('Verifikasi semua kontak dengan sumber bukti.');
 if(!steps.some(s=>s.kind==='email'))issues.push('Tambahkan langkah email.');
 for(const [i,s] of steps.entries()){
  if(s.kind==='wait'||s.kind==='condition')continue;
  if(!s.body.trim()||(s.kind==='email'&&!s.subject.trim()))issues.push(`Isi pesan langkah ${i+1}.`);
  if(contacts.some(c=>personalize(s.subject+'\n'+s.body,c,sender).unresolved.length))issues.push(`Lengkapi variabel langkah ${i+1}.`);
 }
 return issues;
}
// These capabilities stay closed until a real, verified adapter is configured.
export const outreachCapabilities={email:{state:'requires_authorization',reason:'Gunakan Review & luncurkan pada Campaigns dengan sender SMTP terverifikasi dan persetujuan audience.'},linkedin:{state:'unsupported',reason:'Koneksi dan outreach LinkedIn dilakukan manual.'},leo:{state:'requires_authorization',reason:'Gunakan panel LEO untuk draft. GPT membutuhkan koneksi provider AI; draft template tersedia tanpa AI.'}} as const;
