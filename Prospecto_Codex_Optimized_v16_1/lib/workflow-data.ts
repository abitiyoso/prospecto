import type {WorkflowData} from './workflow-types';
import {presentationEligible} from './workflow-services';
import {collectRows} from './data';
type Db=Awaited<ReturnType<typeof import('./supabase').supabase>>;
export async function workflowData(db:Db,w:string,email:string):Promise<WorkflowData>{
 const all=async<T,>(table:string,fields:string,order:string)=>collectRows<T>(async(a,b)=>{const r=await db.from(table).select(fields).eq('workspace_id',w).order(order,{ascending:false}).order('id').range(a,b);return {data:r.data as unknown as T[]|null,error:r.error};});
 const [documents,leoRuns,connections,launches,invites,suppressions,team,leadLists,listMembers]=await Promise.all([
  collectRows((a,b)=>db.from('knowledge_documents').select('source_id,product_id,state,error_code,updated_at,chunk_count').eq('workspace_id',w).order('source_id').range(a,b)),
  db.from('leo_runs').select('id,product_id,engine,result,source_refs,created_at').eq('workspace_id',w).order('created_at',{ascending:false}).limit(20),
  db.from('channel_connections').select('id,sender_email,sender_name,status,verified_at').eq('workspace_id',w),
  all<WorkflowData['launches'][number]>('campaign_launches','id,campaign_id,connection_id,state,created_at','created_at'),
  all<WorkflowData['invites'][number]>('workspace_invites','id,email,expires_at,accepted_at,revoked_at','created_at'),
  all<WorkflowData['suppressions'][number]>('smtp_suppressions','id,email,reason','created_at'),
  db.rpc('workspace_team',{w}),
  all<WorkflowData['leadLists'][number]>('lead_lists','id,name,created_at','created_at'),
  collectRows((a,b)=>db.from('lead_list_members').select('list_id,contact_id').eq('workspace_id',w).order('list_id').order('contact_id').range(a,b)),
 ]);if(leoRuns.error||connections.error||team.error)throw new Error('Data workflow belum dapat dimuat');
 return {documents,leoRuns:leoRuns.data,connections:connections.data,launches,jobs:[],invites,suppressions,team:team.data,leadLists,listMembers,presentationEligible:presentationEligible(email),openAIAvailable:!!process.env.OPENAI_API_KEY&&!!process.env.OPENAI_MODEL} as WorkflowData;
}
