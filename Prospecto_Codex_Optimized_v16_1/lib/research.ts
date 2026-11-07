export type ProductFact={id:string;title:string;text:string};
export type FitReason={product_quote:string;company_quote:string;reason:string};
export type ResearchCandidate={kind:'company'|'pic';name:string;domain:string;title:string;email:string;industry:string;location:string;evidence:string;source_url:string;profile_quote?:string;fit_reasons?:FitReason[]};
export type WebEvidence={title:string;url:string;description:string;candidates?:ResearchCandidate[]};
export type ResearchRun={id:string;product_id:string;kind:'company'|'pic';query:string;status:'running'|'completed'|'failed';results:WebEvidence[];error_code:string;created_at:string};
export function publicEvidenceUrl(raw:string){try{if(raw.length>2000)return null;const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||/[:\[\]]/.test(u.hostname)||/\.(local|internal|localhost)$/i.test(u.hostname))return null;return u.href;}catch{return null;}}
export function normalizeEvidence(rows:unknown):WebEvidence[]{
 if(!Array.isArray(rows))return[];const seen=new Set<string>();const result:WebEvidence[]=[];
 for(const row of rows){if(!row||typeof row!=='object')continue;const r=row as Record<string,unknown>;const url=typeof r.url==='string'?publicEvidenceUrl(r.url):null;if(!url||seen.has(url))continue;seen.add(url);result.push({url,title:typeof r.title==='string'?r.title.slice(0,300):new URL(url).hostname,description:typeof r.description==='string'?r.description.slice(0,1500):''});if(result.length===5)break;}
 return result;
}
export function researchError(status:number){return status===401||status===403?'Layanan riset belum terautentikasi. Hubungi admin workspace.':status===402?'Kuota layanan riset belum tersedia. Hubungi admin workspace.':status===429?'Batas layanan riset tercapai. Coba lagi beberapa saat.':'Layanan riset belum dapat dihubungi. Coba lagi.';}

