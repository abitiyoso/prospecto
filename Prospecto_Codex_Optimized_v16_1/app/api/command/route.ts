import {icpInput,companyInput,picInput} from '@/lib/prospect';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { campaignInput, contactInput, csvExport, mapCsv, productInput, sourceInput, uuid } from '@/lib/domain';
import { z } from 'zod';
import { readBody, sameOrigin, requestOrigin } from '@/lib/request';
import { collectRows } from '@/lib/data';
import { outreachInput, templateInput, outreachCapabilities } from '@/lib/outreach';
export async function POST(req:NextRequest) {
 if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});
 if(Number(req.headers.get('content-length')||0)>2_500_000)return NextResponse.json({error:'Permintaan terlalu besar'},{status:413});
 try {
  const raw=new TextDecoder().decode(await readBody(req,2_500_000));
  const input=JSON.parse(raw); const db=await supabase();const {data:{user}}=await db.auth.getUser();
  if(!user)return NextResponse.json({error:'Silakan masuk kembali'},{status:401});
  const action=z.string().parse(input.action); const ok=(data:unknown={ok:true})=>NextResponse.json(data);
  const check=<T,>(r:{data:T;error:unknown})=>{if(r.error)throw new Error('Operasi data ditolak atau belum berhasil');return r.data as NonNullable<T>;};
  if(action==='workspace.create') {const name=z.string().trim().min(1).max(160).parse(input.name);const id=crypto.randomUUID();check(await db.from('workspaces').insert({id,name,created_by:user.id}));(await cookies()).set('prospecto-workspace',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});return ok();}
  const w=uuid.parse(input.workspace_id); const membership=await db.from('workspace_memberships').select('role').eq('workspace_id',w).eq('user_id',user.id).single();
  if(!membership.data)return NextResponse.json({error:'Workspace tidak diizinkan'},{status:403});
  const role=membership.data.role;
  if((action.endsWith('.delete')||action==='leads.export'||action==='workspace.rename')&&!['owner','admin'].includes(role))return NextResponse.json({error:'Tindakan ini membutuhkan owner atau admin'},{status:403});
  if(action==='workspace.switch') {(await cookies()).set('prospecto-workspace',w,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});return ok();}
  if(action==='workspace.rename'){check(await db.from('workspaces').update({name:z.string().trim().min(1).max(160).parse(input.name)}).eq('id',w));return ok();}
  if(action==='icp.save'){const v=icpInput.parse(input.values);check(await db.from('icp_profiles').upsert({...v,workspace_id:w},{onConflict:'workspace_id,product_id'}));return ok();}
  if(action==='company.save'){const v=companyInput.parse(input.values);check(await db.from('companies').upsert({...v,workspace_id:w,observed_at:new Date().toISOString()},{onConflict:'workspace_id,domain'}));return ok();}
  if(action==='pic.save'){const v=picInput.parse(input.values);if(input.id)check(await db.from('pic_candidates').update(v).eq('workspace_id',w).eq('id',uuid.parse(input.id)).select('id').single());else check(await db.from('pic_candidates').insert({...v,workspace_id:w}));return ok();}
  if(action==='pic.promote'){const id=check(await db.rpc('promote_pic',{w,pic:uuid.parse(input.id)}));return ok({id});}
  if(action==='product.save') {const value=productInput.parse(input.values);if(input.id)check(await db.from('products').update(value).eq('workspace_id',w).eq('id',uuid.parse(input.id)).select('id').single());else check(await db.from('products').insert({...value,workspace_id:w}));return ok();}
  if(action==='product.delete'){const id=uuid.parse(input.id);const sources=await collectRows((from,to)=>db.from('knowledge_sources').select('storage_path').eq('workspace_id',w).eq('product_id',id).order('id').range(from,to));const paths=sources.map(s=>s.storage_path).filter((p):p is string=>!!p);if(paths.length)check(await db.storage.from('product-kms').remove(paths));check(await db.from('products').delete().eq('workspace_id',w).eq('id',id));return ok();}
  if(action==='source.add'){const v=sourceInput.parse(input.values);check(await db.from('knowledge_sources').insert({...v,workspace_id:w,status:'pending'}));return ok();}
  if(action==='source.download'){const s=check(await db.from('knowledge_sources').select('storage_path,upload_state').eq('workspace_id',w).eq('id',uuid.parse(input.id)).single());if(!s.storage_path||s.upload_state!=='stored')throw new Error('Berkas tidak tersedia');const result=check(await db.storage.from('product-kms').createSignedUrl(s.storage_path,60));return ok({url:result.signedUrl});}
  if(action==='source.delete'){const s=check(await db.from('knowledge_sources').select('storage_path').eq('workspace_id',w).eq('id',uuid.parse(input.id)).single());if(s.storage_path)check(await db.storage.from('product-kms').remove([s.storage_path]));check(await db.from('knowledge_sources').delete().eq('workspace_id',w).eq('id',input.id));return ok();}
  if(action==='contact.save'){const v=contactInput.parse(input.values);if(input.id){const {company,domain,...fields}=v;let co:string|null=null;if(domain){check(await db.from('companies').upsert({workspace_id:w,name:company,domain},{onConflict:'workspace_id,domain'}));co=check(await db.from('companies').select('id').eq('workspace_id',w).eq('domain',domain).single()).id;}check(await db.from('contacts').update({...fields,company_name:company,company_id:co}).eq('workspace_id',w).eq('id',uuid.parse(input.id)).select('id').single());}else{const result=check(await db.rpc('import_contacts',{w,records:[v]}));if(result.duplicates)throw new Error('Email sudah ada di workspace');}return ok();}
  if(action==='contact.delete'){check(await db.from('contacts').delete().eq('workspace_id',w).eq('id',uuid.parse(input.id)));return ok();}
  if(action==='leads.import'){const parsed=mapCsv(z.string().max(2_000_000).parse(input.csv),z.record(z.string(),z.string()).parse(input.mapping));const report=check(await db.rpc('import_contacts',{w,records:parsed.valid}));return ok({...report,duplicates:report.duplicates+parsed.duplicates,errors:parsed.errors,total:parsed.total});}
  if(action==='leads.export'){const rows=await collectRows((from,to)=>db.from('contacts').select('name,email,title,source_url,verification,company_name,companies(name,domain)').eq('workspace_id',w).order('id').range(from,to));return ok({csv:csvExport([['name','email','title','source_url','verification','company','domain'],...rows.map(r=>{const c=r.companies as unknown as {name:string;domain:string}|null;return[r.name,r.email,r.title,r.source_url,r.verification,c?.name||r.company_name||'',c?.domain||''];})])});}
  if(action==='campaign.create'){const v=campaignInput.parse(input.values);const id=check(await db.rpc('create_campaign',{w,campaign_name:v.name,ids:v.contact_ids}));return ok({id});}
  if(action==='campaign.save'){const v=outreachInput.parse(input.values);const ids=campaignInput.shape.contact_ids.parse(input.contact_ids);if(new Set(ids).size!==ids.length)throw new Error('Audience berisi duplikat');check(await db.rpc('save_outreach',{w,c:uuid.parse(input.id),v,ids}));return ok();}
  if(action==='template.save'){check(await db.from('campaign_templates').insert({...templateInput.parse(input.values),workspace_id:w}));return ok();}
  if(action==='template.delete'){check(await db.from('campaign_templates').delete().eq('workspace_id',w).eq('id',uuid.parse(input.id)));return ok();}
  if(action==='campaign.approve'){if(!['owner','admin'].includes(role))return NextResponse.json({error:'Approval membutuhkan owner atau admin'},{status:403});check(await db.rpc('approve_campaign',{w,c:uuid.parse(input.id)}));return ok();}
  if(['campaign.preflight','campaign.launch','campaign.leo'].includes(action)){
   const id=uuid.parse(input.id);const state=check(await db.rpc('campaign_preflight',{w,c:id}));if(!state)throw new Error('Campaign tidak diizinkan');
   if(action==='campaign.preflight')return ok(state);
   return NextResponse.json({error:action==='campaign.leo'?outreachCapabilities.leo.reason:outreachCapabilities.email.reason},{status:409});
  }
  return NextResponse.json({error:'Fitur ini belum tersedia'},{status:400});
 } catch(e) { return NextResponse.json({error:e instanceof z.ZodError?e.issues.map(x=>x.message).join('; '):e instanceof Error?e.message:'Permintaan gagal'},{status:400}); }
}





