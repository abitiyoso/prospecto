import {zipSync,strToU8,strFromU8} from 'fflate';
import {z} from 'zod';
import {readOfficeArchive} from './documents';
import {collectRows} from './data';
import {productInput,sourceInput,contactInput,assertUpload,uuid} from './domain';
import {icpInput,companyInput,picInput} from './prospect';
import {templateInput,outreachInput} from './outreach';
type Db=Awaited<ReturnType<typeof import('./supabase').supabase>>;
const tables=['products','knowledge_sources','companies','contacts','icp_profiles','pic_candidates','campaign_templates','campaigns','campaign_audience','lead_lists','lead_list_members'] as const;
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Backup/restore data belum berhasil');return r.data as NonNullable<T>;};
export function restoredWorkspaceName(value:unknown){const name=z.string().trim().min(1).max(160).parse(value);return name.slice(0,149).replace(/[\uD800-\uDBFF]$/,'')+' (restored)';}
const fileMime=(name:string)=>name.toLowerCase().endsWith('.pdf')?'application/pdf':name.toLowerCase().endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'text/plain';
export async function validateBackupRecords(records:Record<string,any[]>,files:Record<string,Uint8Array>){
 const keys:Record<string,Set<string>>={};
 for(const table of tables){keys[table]=new Set();for(const row of records[table])if(!['campaign_audience','lead_list_members'].includes(table)){const id=uuid.parse(row.id);if(keys[table].has(id))throw new Error('ID backup duplikat');keys[table].add(id);}}
 const ref=(table:string,id:unknown)=>{if(typeof id!=='string'||!keys[table].has(id))throw new Error('Referensi backup tidak lengkap');return id;};
 for(const p of records.products)productInput.parse(p);
 for(const c of records.companies)companyInput.parse(c);
 for(const c of records.contacts){if(c.company_id)ref('companies',c.company_id);contactInput.parse(c);}
 for(const s of records.knowledge_sources){ref('products',s.product_id);if(s.kind==='file'){
  if(s.upload_state!=='stored'||!files['files/'+s.id])throw new Error('Arsip tidak lengkap: berkas KMS asli tidak tersedia.');
  const title=z.string().trim().min(1).max(200).parse(s.title),data=files['files/'+s.id],mime=fileMime(title);assertUpload(title,mime,data);if(mime.includes('wordprocessingml'))await readOfficeArchive(data,'word/document.xml');
 }else sourceInput.parse(s);}
 for(const i of records.icp_profiles){ref('products',i.product_id);icpInput.parse(i);}
 for(const p of records.pic_candidates){ref('companies',p.company_id);picInput.parse(p);}
 for(const t of records.campaign_templates)templateInput.parse(t);
 for(const c of records.campaigns){if(c.product_id)ref('products',c.product_id);outreachInput.parse(c);}
 for(const a of records.campaign_audience){ref('campaigns',a.campaign_id);ref('contacts',a.contact_id);}
 for(const l of records.lead_lists)z.string().trim().min(1).max(160).parse(l.name);
 for(const m of records.lead_list_members){ref('lead_lists',m.list_id);ref('contacts',m.contact_id);}
 for(const [table,a,b]of [['campaign_audience','campaign_id','contact_id'],['lead_list_members','list_id','contact_id']]){const pairs=records[table].map(r=>r[a]+':'+r[b]);if(new Set(pairs).size!==pairs.length)throw new Error('Keanggotaan backup duplikat');}
}
export async function backupWorkspace(db:Db,w:string){
 const records:Record<string,any[]>={};for(const table of tables)records[table]=await collectRows((a,b)=>{let q=db.from(table).select('*').eq('workspace_id',w);q=table==='campaign_audience'?q.order('campaign_id').order('contact_id'):table==='lead_list_members'?q.order('list_id').order('contact_id'):q.order('id');return q.range(a,b);});
 if(Object.values(records).some(rows=>rows.length>5000))throw new Error('Backup presentasi maksimal 5.000 baris per jenis data');
 if(records.knowledge_sources.some(s=>s.kind==='file'&&s.upload_state!=='stored'))throw new Error('Selesaikan atau hapus upload KMS yang belum tersimpan sebelum backup.');
 if(records.knowledge_sources.filter(s=>s.kind==='file').length>999)throw new Error('Backup maksimal 999 berkas KMS.');
 const files:Record<string,Uint8Array>={};let bytes=0;
 for(const s of records.knowledge_sources)if(s.kind==='file'&&s.upload_state==='stored'){
  const blob=must(await db.storage.from('product-kms').download(s.storage_path));const data=new Uint8Array(await blob.arrayBuffer());bytes+=data.length;if(bytes>20*1024*1024)throw new Error('Backup presentasi maksimal 20 MB berkas asli');files['files/'+s.id]=data;
 }
 await validateBackupRecords(records,files);
 const workspace=must(await db.from('workspaces').select('name,timezone').eq('id',w).single());
 files['manifest.json']=strToU8(JSON.stringify({version:1,workspace,records,created_at:new Date().toISOString(),scope:'Product/KMS/ICP/leads/lists/campaign drafts. No sender credentials, sessions, payments or execution jobs.'}));
 if(files['manifest.json'].length+bytes>40*1024*1024)throw new Error('Isi arsip backup maksimal 40 MB sebelum kompresi.');
 const zip=zipSync(files);if(zip.length>10*1024*1024)throw new Error('Arsip backup maksimal 10 MB untuk restore aplikasi');return zip;
}
export async function restoreWorkspace(db:Db,bytes:Uint8Array,actor:string){
 const files=await readOfficeArchive(bytes,'manifest.json');const manifest=JSON.parse(strFromU8(files['manifest.json']));
 if(manifest.version!==1||!manifest.records||!manifest.workspace)throw new Error('Format backup tidak sesuai');
 const records:Record<string,any[]>={};for(const table of tables){records[table]=z.array(z.record(z.string(),z.unknown())).max(5000).parse(manifest.records[table]||[]);}
 const name=restoredWorkspaceName(manifest.workspace.name),timezone=z.enum(['Asia/Jakarta','Asia/Makassar','Asia/Jayapura']).parse(manifest.workspace.timezone||'Asia/Jakarta');
 await validateBackupRecords(records,files);
 const maps=Object.fromEntries(tables.map(t=>[t,new Map<string,string>()]));for(const table of tables)for(const r of records[table])if(r.id)maps[table].set(String(r.id),crypto.randomUUID());
 const w=crypto.randomUUID(),paths:string[]=[];
 try{
  must(await db.from('workspaces').insert({id:w,name,created_by:actor,timezone}));
  for(const p of records.products)must(await db.from('products').insert({...productInput.parse(p),id:maps.products.get(p.id),workspace_id:w}));
  for(const c of records.companies)must(await db.from('companies').insert({...companyInput.parse(c),id:maps.companies.get(c.id),workspace_id:w}));
  for(const c of records.contacts){const company=records.companies.find(co=>co.id===c.company_id);const parsed=contactInput.parse({...c,company:company?.name||c.company_name||'',domain:company?.domain||''});const {company:companyName,domain:_,...v}=parsed;must(await db.from('contacts').insert({...v,id:maps.contacts.get(c.id),workspace_id:w,company_name:companyName,company_id:c.company_id?maps.companies.get(c.company_id):null}));}
  for(const s of records.knowledge_sources){const product_id=maps.products.get(s.product_id);if(!product_id)throw new Error('Referensi produk backup tidak valid');const id=maps.knowledge_sources.get(s.id)!;
   if(s.kind==='file'){
    const data=files['files/'+s.id],mime=fileMime(s.title);
    const path=`${w}/${product_id}/${id}`;must(await db.from('knowledge_sources').insert({id,workspace_id:w,product_id,title:z.string().max(200).parse(s.title),kind:'file',storage_path:path,upload_state:'uploading'}));must(await db.storage.from('product-kms').upload(path,data,{contentType:mime}));paths.push(path);must(await db.from('knowledge_sources').update({upload_state:'stored'}).eq('workspace_id',w).eq('id',id));
   }else must(await db.from('knowledge_sources').insert({...sourceInput.parse({...s,product_id}),id,workspace_id:w}));
  }
  for(const i of records.icp_profiles)must(await db.from('icp_profiles').insert({...icpInput.parse({...i,product_id:maps.products.get(i.product_id)}),workspace_id:w}));
  for(const p of records.pic_candidates)must(await db.from('pic_candidates').insert({...picInput.parse({...p,company_id:maps.companies.get(p.company_id)}),id:maps.pic_candidates.get(p.id),workspace_id:w}));
  for(const t of records.campaign_templates)must(await db.from('campaign_templates').insert({...templateInput.parse(t),workspace_id:w}));
  for(const l of records.lead_lists)must(await db.from('lead_lists').insert({id:maps.lead_lists.get(l.id),workspace_id:w,name:l.name,created_by:actor}));
  if(records.lead_list_members.length)must(await db.from('lead_list_members').insert(records.lead_list_members.map(m=>({workspace_id:w,list_id:maps.lead_lists.get(m.list_id),contact_id:maps.contacts.get(m.contact_id)}))));
  for(const c of records.campaigns){const ids=records.campaign_audience.filter(a=>a.campaign_id===c.id).map(a=>maps.contacts.get(a.contact_id)) as string[];const v=outreachInput.parse({...c,product_id:c.product_id?maps.products.get(c.product_id):null});if(ids.length){const id=must(await db.rpc('create_campaign',{w,campaign_name:c.name,ids}));must(await db.rpc('save_outreach',{w,c:id,v,ids}));}else{const first=v.steps.find(s=>s.kind==='email');must(await db.from('campaigns').insert({...v,id:maps.campaigns.get(c.id),workspace_id:w,status:'draft',subject:first?.subject||'',body:first?.body||''}));}}
  return {workspace_id:w,products:records.products.length,contacts:records.contacts.length,files:paths.length,executionRestored:false};
 }catch{
  if(paths.length)await db.storage.from('product-kms').remove(paths);
  for(const table of ['campaigns','campaign_templates','lead_lists','contacts','companies','products'])await db.from(table).delete().eq('workspace_id',w);
  // A partially restored workspace remains owned by the caller if cleanup is interrupted.
  throw new Error('Restore belum berhasil. Tidak ada campaign dijalankan; periksa workspace restored jika koneksi terputus.');
 }
}
