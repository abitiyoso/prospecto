import {z} from 'zod';
import {safeUrl,uuid} from './domain';
const text=(n:number)=>z.string().trim().max(n).default('');
const optionalCount=z.preprocess(v=>v===''||v==null?null:Number(v),z.number().int().min(1).max(100000000).nullable());
const https=z.string().trim().max(2000).refine(safeUrl,'URL sumber harus HTTPS');
export const icpInput=z.object({product_id:uuid,industry:text(500),location:text(500),buyer_roles:text(500),employee_min:optionalCount,employee_max:optionalCount,exclusions:text(4000)}).refine(v=>v.employee_min==null||v.employee_max==null||v.employee_max>=v.employee_min,'Batas karyawan tidak valid');
export const companyInput=z.object({name:z.string().trim().min(1).max(160),domain:z.string().trim().toLowerCase().max(253).regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),industry:text(160),location:text(160),employee_count:optionalCount,source_url:z.union([z.literal(''),https]).default('')});
export const picInput=z.object({company_id:uuid,name:z.string().trim().min(1).max(160),title:text(160),email:z.union([z.literal(''),z.string().trim().toLowerCase().email().max(254)]).default(''),source_url:https,confidence:z.enum(['unassessed','low','medium','high']).default('unassessed'),verification:z.enum(['candidate','verified','rejected']).default('candidate'),notes:text(4000)});
export type ICP=z.infer<typeof icpInput>&{id:string};
export type Company=z.infer<typeof companyInput>&{id:string;observed_at:string};
export type PIC=z.infer<typeof picInput>&{id:string;observed_at:string};
export function matchesICP(company:Company,icp:ICP){
 const match=(filter:string,value:string)=>!filter.trim()||filter.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).some(s=>value.toLowerCase().includes(s));
 const excluded=(icp.exclusions||'').split(/[,;\n]+/).map(s=>s.trim().toLowerCase()).filter(Boolean);
 const facts=[company.name,company.domain,company.industry,company.location].filter(Boolean).map(s=>s.toLowerCase());
 return !excluded.some(term=>facts.some(fact=>fact.includes(term)))&&match(icp.industry,company.industry)&&match(icp.location,company.location)
  &&(icp.employee_min==null||(company.employee_count!=null&&company.employee_count>=icp.employee_min))
  &&(icp.employee_max==null||(company.employee_count!=null&&company.employee_count<=icp.employee_max));
}
