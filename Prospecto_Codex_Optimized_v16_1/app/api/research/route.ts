import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {supabase} from '@/lib/supabase';
import {readBody,sameOrigin} from '@/lib/request';
import {adminDb} from '@/lib/admin';
import {uuid} from '@/lib/domain';
import {normalizeEvidence,researchError} from '@/lib/research';
import {researchQuery,excludedCandidate,publicPicQuery} from '@/lib/research-candidates';
import {extractResearchCandidates,planCompanySearch} from '@/lib/research-provider';
import {productResearchFacts} from '@/lib/product-research';
import {AIProviderError} from '@/lib/leo-contract';
export const maxDuration=120;
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});
 const input=z.object({workspace_id:uuid,product_id:uuid,kind:z.enum(['company','pic']),company_id:uuid.optional(),scope:z.enum(['company','public']).default('company'),query:z.string().trim().max(300).default('')});
 try{
  const v=input.parse(JSON.parse(new TextDecoder().decode(await readBody(req,6000))));const db=await supabase();const{data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Silakan masuk kembali'},{status:401});
  const{data:product}=await db.from('products').select('id,industry,buyer_roles').eq('workspace_id',v.workspace_id).eq('id',v.product_id).single();if(!product)return NextResponse.json({error:'Produk tidak diizinkan'},{status:403});
  const{data:icp}=await db.from('icp_profiles').select('industry,location,buyer_roles,employee_min,employee_max,exclusions').eq('workspace_id',v.workspace_id).eq('product_id',v.product_id).maybeSingle();
  const {facts}=await productResearchFacts(db,v.workspace_id,v.product_id);
  if(v.kind==='company'&&!v.query&&!facts.some(f=>f.id!=='product.name'))return NextResponse.json({error:'Lengkapi manfaat/target produk atau isi kata kunci calon pembeli terlebih dahulu.'},{status:400});
  let company:{name:string;domain:string}|undefined;
  if(v.kind==='pic'){
   const{data:found}=await db.from('companies').select('name,domain').eq('workspace_id',v.workspace_id).eq('id',v.company_id||'').single();if(!found)return NextResponse.json({error:'Pilih perusahaan yang diizinkan'},{status:403});company=found;
  }
  let query=researchQuery(v.kind,v.query,product,icp,company?.domain);
  if(company&&v.scope==='public')query=publicPicQuery(company.name,v.query,icp?.buyer_roles||product.buyer_roles||'');
  const rates=await db.from('credit_action_rates').select('id').eq('action',v.kind==='company'?'company_research':'pic_research').eq('enabled',true).lte('effective_from',new Date().toISOString()).or('effective_to.is.null,effective_to.gt.'+new Date().toISOString()).limit(1);
  if(rates.error||rates.data?.length)return NextResponse.json({error:'Penagihan riset memerlukan koneksi worker kredit sebelum tarif diaktifkan.'},{status:503});
  if(!process.env.FIRECRAWL_API_KEY)return NextResponse.json({error:'Layanan riset belum terhubung'},{status:503});
  const budget=await adminDb().rpc('reserve_provider_usage',{w:v.workspace_id,actor:user.id,k:v.kind});if(budget.error)return NextResponse.json({error:'Batas riset akun/server tercapai. Coba lagi nanti.'},{status:429});
  if(v.kind==='company'&&!v.query){const usage=await adminDb().rpc('reserve_provider_usage',{w:v.workspace_id,actor:user.id,k:'leo'});if(usage.error)return NextResponse.json({error:'Batas analisis produk tercapai. Coba lagi nanti.'},{status:429});query=await planCompanySearch(facts,icp);}
  const reserved=await db.rpc('reserve_research',{w:v.workspace_id,p:v.product_id,k:v.kind,q:query});if(reserved.error)return NextResponse.json({error:'Batas riset workspace tercapai. Tunggu satu menit dan coba lagi.'},{status:429});
  const id=reserved.data as string;
  try{
   const response=await fetch('https://api.firecrawl.dev/v2/search',{method:'POST',headers:{Authorization:`Bearer ${process.env.FIRECRAWL_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({query,limit:5,sources:[{type:'web'}],domainTools:false,...(company&&v.scope==='company'?{includeDomains:[company.domain]}:{excludeDomains:['linkedin.com','facebook.com','instagram.com','tiktok.com']}),scrapeOptions:{formats:['markdown'],onlyMainContent:true,timeout:15000},timeout:50000}),signal:AbortSignal.timeout(55000)});
   if(!response.ok){await db.from('research_runs').update({status:'failed',error_code:`provider_${response.status}`}).eq('workspace_id',v.workspace_id).eq('id',id);return NextResponse.json({error:researchError(response.status)},{status:502});}
   const raw=await response.json();if(raw.success!==true)throw new Error('Provider failure');const rows=Array.isArray(raw.data?.web)?raw.data.web:[],results=normalizeEvidence(rows).filter(r=>!company||v.scope==='public'||new URL(r.url).hostname===company.domain||new URL(r.url).hostname.endsWith('.'+company.domain));
   const sources=results.flatMap(result=>{const row=rows.find((r:any)=>{try{return new URL(r.url).href===result.url;}catch{return false;}});return typeof row?.markdown==='string'&&row.markdown.trim()?[{url:result.url,text:[result.title,result.description,row.markdown.slice(0,18000)].join('\n')}]:[];});let errorCode='';
   if(sources.length){try{const usage=await adminDb().rpc('reserve_provider_usage',{w:v.workspace_id,actor:user.id,k:'leo'});if(usage.error)throw new AIProviderError('ai_rate_limited','Batas pengenalan nama tercapai.',429);const candidates=(await extractResearchCandidates(sources,v.kind,company,icp?.buyer_roles||product.buyer_roles,facts,icp,v.scope==='public')).filter(c=>!excludedCandidate(c,icp?.exclusions||''));for(const result of results)result.candidates=candidates.filter(c=>c.source_url===result.url);}catch(e){errorCode=e instanceof AIProviderError?'names_'+e.code:'names_unavailable';}}
   else if(results.length)errorCode='names_source_unreadable';
   const saved=await db.from('research_runs').update({status:'completed',results,error_code:errorCode}).eq('workspace_id',v.workspace_id).eq('id',id).select('*').single();if(saved.error)throw new Error('Persistence failure');return NextResponse.json({run:saved.data});
  }catch{await db.from('research_runs').update({status:'failed',error_code:'unavailable'}).eq('workspace_id',v.workspace_id).eq('id',id);return NextResponse.json({error:researchError(500)},{status:502});}
 }catch(e){if(e instanceof AIProviderError)return NextResponse.json({error:e.message,code:e.code},{status:e.status});return NextResponse.json({error:'Permintaan riset tidak valid'},{status:400});}
}
