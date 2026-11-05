import {zipSync,strToU8,strFromU8} from 'fflate';
import {z} from 'zod';
import {readOfficeArchive} from './documents';
import {collectRows} from './data';
import {productInput,sourceInput,contactInput,assertUpload} from './domain';
import {icpInput,companyInput,picInput} from './prospect';
import {templateInput,outreachInput} from './outreach';
type Db=Awaited<ReturnType<typeof import('./supabase').supabase>>;
const tables=['products','knowledge_sources','companies','contacts','icp_profiles','pic_candidates','campaign_templates','campaigns','campaign_audience'] as const;
const must=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Backup/restore data belum berhasil');return r.data as NonNullable<T>;};
export async function backupWorkspace(db:Db,w:string){
 const records:Record<string,any[]>={};for(const table of tables)records[table]=await collectRows((a,b)=>db.from(table).select('*').eq('workspace_id',w).range(a,b));
 if(Object.values(records).some(rows=>rows.length>5000))throw new Error('Backup presentasi maksimal 5.000 baris per jenis data');
 const files:Record<string,Uint8Array>={};let bytes=0;
 for(const s of records.knowledge_sources)if(s.kind==='file'&&s.upload_state==='stored'){
  const blob=must(await db.storage.from('product-kms').download(s.storage_path));const data=new Uint8Array(await blob.arrayBuffer());bytes+=data.length;if(bytes>20*1024*1024)throw new Error('Backup presentasi maksimal 20 MB berkas asli');files['files/'+s.id]=data;
 }
 const workspace=must(await db.from('workspaces').select('name,timezone').eq('id',w).single());
 files['manifest.json']=strToU8(JSON.stringify({version:1,workspace,records,created_at:new Date().toISOString(),scope:'Product/KMS/ICP/leads/campaign drafts. No sender credentials, sessions, payments or execution jobs.'}));
 const zip=zipSync(files);if(zip.length>10*1024*1024)throw new Error('Arsip backup maksimal 10 MB untuk restore aplikasi');return zip;
}
export async function restoreWorkspace(db:Db,bytes:Uint8Array,actor:string){
 const files=await readOfficeArchive(bytes,'manifest.json');const manifest=JSON.parse(strFromU8(files['manifest.json']));
 if(manifest.version!==1||!manifest.records||!manifest.workspace)throw new Error('Format backup tidak sesuai');
 const records:Record<string,any[]>={};for(const table of tables){records[table]=z.array(z.record(z.string(),z.unknown())).max(5000).parse(manifest.records[table]||[]);}
 const maps=Object.fromEntries(tables.map(t=>[t,new Map<string,string>()]));for(const table of tables)for(const r of records[table])if(r.id)maps[table].set(String(r.id),crypto.randomUUID());
 const w=crypto.randomUUID(),paths:string[]=[];
 try{
  must(await db.from('workspaces').insert({id:w,name:z.string().max(140).parse(manifest.workspace.name)+' (restored)',created_by:actor,timezone:z.enum(['Asia/Jakarta','Asia/Makassar','Asia/Jayapura']).parse(manifest.workspace.timezone||'Asia/Jakarta')}));
  for(const p of records.products)must(await db.from('products').insert({...productInput.parse(p),id:maps.products.get(p.id),workspace_id:w}));
  for(const c of records.companies)must(await db.from('companies').insert({...companyInput.parse(c),id:maps.companies.get(c.id),workspace_id:w}));
  for(const c of records.contacts){const company=records.companies.find(co=>co.id===c.company_id);const parsed=contactInput.parse({...c,company:company?.name||c.company_name||'',domain:company?.domain||''});const {company:companyName,domain:_,...v}=parsed;must(await db.from('contacts').insert({...v,id:maps.contacts.get(c.id),workspace_id:w,company_name:companyName,company_id:c.company_id?maps.companies.get(c.company_id):null}));}
  for(const s of records.knowledge_sources){const product_id=maps.products.get(s.product_id);if(!product_id)throw new Error('Referensi produk backup tidak valid');const id=maps.knowledge_sources.get(s.id)!;
   if(s.kind==='file'){
    const data=files['files/'+s.id];if(!data)continue;const mime=s.title.toLowerCase().endsWith('.pdf')?'application/pdf':s.title.toLowerCase().endsWith('.docx')?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'text/plain';assertUpload(s.title,mime,data);if(mime.includes('wordprocessingml'))await readOfficeArchive(data,'word/document.xml');
    const path=`${w}/${product_id}/${id}`;must(await db.from('knowledge_sources').insert({id,workspace_id:w,product_id,title:z.string().max(200).parse(s.title),kind:'file',storage_path:path,upload_state:'uploading'}));must(await db.storage.from('product-kms').upload(path,data,{contentType:mime}));paths.push(path);must(await db.from('knowledge_sources').update({upload_state:'stored'}).eq('workspace_id',w).eq('id',id));
   }else must(await db.from('knowledge_sources').insert({...sourceInput.parse({...s,product_id}),id,workspace_id:w}));
  }
  for(const i of records.icp_profiles)must(await db.from('icp_profiles').insert({...icpInput.parse({...i,product_id:maps.products.get(i.product_id)}),workspace_id:w}));
  for(const p of records.pic_candidates)must(await db.from('pic_candidates').insert({...picInput.parse({...p,company_id:maps.companies.get(p.company_id)}),id:maps.pic_candidates.get(p.id),workspace_id:w}));
  for(const t of records.campaign_templates)must(await db.from('campaign_templates').insert({...templateInput.parse(t),workspace_id:w}));
  for(const c of records.campaigns){const ids=records.campaign_audience.filter(a=>a.campaign_id===c.id).map(a=>maps.contacts.get(a.contact_id)).filter((v):v is string=>!!v);if(!ids.length)continue;const id=must(await db.rpc('create_campaign',{w,campaign_name:z.string().max(160).parse(c.name),ids}));const v=outreachInput.parse({...c,product_id:c.product_id?maps.products.get(c.product_id):null});must(await db.rpc('save_outreach',{w,c:id,v,ids}));}
  return {workspace_id:w,products:records.products.length,contacts:records.contacts.length,files:paths.length,executionRestored:false};
 }catch{
  if(paths.length)await db.storage.from('product-kms').remove(paths);
  for(const table of ['campaigns','campaign_templates','contacts','companies','products'])await db.from(table).delete().eq('workspace_id',w);
  // A partially restored workspace remains owned by the caller if cleanup is interrupted.
  throw new Error('Restore belum berhasil. Tidak ada campaign dijalankan; periksa workspace restored jika koneksi terputus.');
 }
}
