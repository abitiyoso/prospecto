import {z} from 'zod';
import type {ResearchCandidate} from './research';
export type ResearchSource={url:string;text:string};
export const readableResearchText=(s:string)=>s.replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');
const normal=(s:string)=>readableResearchText(s).normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]+/gu,' ').trim();
export const withinDomain=(url:string,domain:string)=>{try{const host=new URL(url).hostname.toLowerCase();return host===domain||host.endsWith('.'+domain);}catch{return false;}};
export function preferredResearchSources(sources:ResearchSource[],kind:'company'|'pic'){
 if(kind!=='pic')return sources;
 const profiles=sources.filter(s=>/\/(board-of-directors|board-of-commissioners|management|leadership|team|our-team|direksi)\/?$/i.test(new URL(s.url).pathname));
 return profiles.length?profiles:sources;
}
function sourceRole(title:string,quote:string){
 if(!normal(title))return '';
 if(normal(quote).includes(normal(title)))return title;
 const aliases:Record<string,string[]>={'president director':['Presiden Direktur','Direktur Utama'],'vice president director':['Wakil Presiden Direktur','Wakil Direktur Utama'],'director':['Direktur'],'president commissioner':['Presiden Komisaris','Komisaris Utama'],'commissioner':['Komisaris'],'chief executive officer':['CEO'],'chief operating officer':['COO']};
 return aliases[normal(title)]?.find(role=>normal(quote).includes(normal(role)))||'';
}
const candidate=z.object({kind:z.enum(['company','pic']).optional(),source_url:z.string().default(''),name:z.string().trim().min(2).max(160),title:z.string().trim().max(160).default(''),email:z.string().trim().max(254).default(''),industry:z.string().trim().max(160).default(''),location:z.string().trim().max(160).default(''),evidence:z.string().trim().min(5).max(1800),official_company_site:z.boolean().optional()});
export function groundedCandidates(raw:unknown,sources:ResearchSource[],kind:'company'|'pic',companyDomain?:string):ResearchCandidate[]{
 const parsed=z.object({candidates:z.array(z.unknown()).max(10)}).parse(raw),seen=new Set<string>(),out:ResearchCandidate[]=[];
 for(const value of parsed.candidates){const v=candidate.safeParse(value);if(!v.success)continue;const c=v.data,source=c.source_url?sources.find(s=>s.url===c.source_url):sources.find(s=>normal(s.text).includes(normal(c.evidence)));if(c.kind&&c.kind!==kind||!source||c.official_company_site===false||kind==='company'&&(c.official_company_site!==true||c.title))continue;
  const text=normal(source.text),quote=normal(c.evidence),name=normal(c.name);if(!name||!quote||!text.includes(quote)||!quote.includes(name))continue;
  const title=kind==='pic'&&c.title?sourceRole(c.title,c.evidence):'';
  if(kind==='pic'&&(!companyDomain||!withinDomain(source.url,companyDomain)||!title))continue;
  const email=c.email.toLowerCase();if(email&&(!z.email().safeParse(email).success||!c.evidence.toLowerCase().includes(email)||!source.text.toLowerCase().includes(email)))continue;
  const domain=new URL(source.url).hostname.replace(/^www\./,'').toLowerCase(),key=kind==='pic'?name:domain;if(seen.has(key))continue;seen.add(key);
  out.push({kind,name:c.name,domain:kind==='pic'?companyDomain!:domain,title,email:kind==='pic'?email:'',industry:c.industry&&text.includes(normal(c.industry))?c.industry:'',location:c.location&&text.includes(normal(c.location))?c.location:'',evidence:c.evidence,source_url:source.url});
 }
 return out;
}
export function researchQuery(kind:'company'|'pic',extra:string,product:{industry:string;buyer_roles:string},icp:{industry:string;location:string;buyer_roles:string}|null,domain?:string){
 if(kind==='pic')return `site:${domain} ${extra||icp?.buyer_roles||product.buyer_roles||'direksi management leadership team'}`.slice(0,1000);
 return (extra||[icp?.industry||product.industry,icp?.location,'perusahaan website resmi'].filter(Boolean).join(' ')).slice(0,1000);
}
