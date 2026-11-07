import 'server-only';
import type {ProductFact,ResearchCandidate} from './research';
type Db=Awaited<ReturnType<typeof import('./supabase').supabase>>;
export async function productResearchFacts(db:Db,w:string,p:string){
 const r=await db.from('products').select('name,category,industry,buyer_roles,pain_points,value_proposition,pricing_context').eq('workspace_id',w).eq('id',p).single();if(r.error)throw Error('Produk tidak diizinkan');
 const refs=await db.rpc('search_knowledge',{w,p,q:''});if(refs.error)throw Error('Pengetahuan produk belum dapat dibaca');
 const facts:ProductFact[]=Object.entries(r.data).filter(([,v])=>!!v).map(([key,text])=>({id:'product.'+key,title:key,text:String(text)}));for(const s of refs.data||[])facts.push({id:s.source_id,title:s.title,text:s.excerpt});return {product:r.data,facts};
}
export async function companyResearchProfile(db:Db,w:string,p:string,companyId:string){
 const product=await db.from('products').select('id').eq('workspace_id',w).eq('id',p).single(),co=await db.from('companies').select('id,name,domain,industry,location,employee_count,source_url').eq('workspace_id',w).eq('id',companyId).single();if(product.error||co.error)throw Error('Produk atau perusahaan tidak diizinkan');
 // postgrest-js serializes array arguments as PostgreSQL arrays; results is JSONB.
 const match=JSON.stringify([{candidates:[{kind:'company',domain:co.data.domain}]}]);
 const r=await db.from('research_runs').select('id,results,created_at').eq('workspace_id',w).eq('product_id',p).eq('kind','company').eq('status','completed').contains('results',match).order('created_at',{ascending:false}).limit(1).maybeSingle();if(r.error)throw Error('Profil perusahaan belum dapat dibaca');
 const candidate=(r.data?.results||[]).flatMap((s:any)=>s.candidates||[]).find((c:ResearchCandidate)=>c.kind==='company'&&c.domain===co.data.domain) as ResearchCandidate|undefined;
 return {company:co.data,candidate:candidate||null,product_id:p,research_id:r.data?.id||null,observed_at:r.data?.created_at||null};
}
