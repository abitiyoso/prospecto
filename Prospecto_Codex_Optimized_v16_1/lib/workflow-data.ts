import type {WorkflowData} from './workflow-types';
import {presentationEligible} from './workflow-services';
type Db=Awaited<ReturnType<typeof import('./supabase').supabase>>;
export async function workflowData(db:Db,w:string,email:string):Promise<WorkflowData>{
 const results=await Promise.all([
  db.from('knowledge_documents').select('source_id,product_id,state,error_code,updated_at,chunk_count').eq('workspace_id',w).order('updated_at',{ascending:false}).limit(100),
  db.from('leo_runs').select('id,product_id,engine,result,source_refs,created_at').eq('workspace_id',w).order('created_at',{ascending:false}).limit(20),
  db.from('channel_connections').select('id,sender_email,sender_name,status,verified_at').eq('workspace_id',w),
  db.from('campaign_launches').select('id,campaign_id,connection_id,state,created_at').eq('workspace_id',w).order('created_at',{ascending:false}).limit(30),
  db.from('outbound_jobs').select('id,launch_id,contact_id,step_index,state,due_at,attempts,note,message_id').eq('workspace_id',w).order('due_at',{ascending:false}).limit(200),
  db.from('workspace_invites').select('id,email,expires_at,accepted_at').eq('workspace_id',w).order('created_at',{ascending:false}).limit(50),
  db.from('smtp_suppressions').select('id,email,reason').eq('workspace_id',w).order('created_at',{ascending:false}).limit(100),
 ]);if(results.some(r=>r.error))throw new Error('Data workflow belum dapat dimuat');
 return {documents:results[0].data,leoRuns:results[1].data,connections:results[2].data,launches:results[3].data,jobs:results[4].data,invites:results[5].data,suppressions:results[6].data,presentationEligible:presentationEligible(email),openAIAvailable:!!process.env.OPENAI_API_KEY&&!!process.env.OPENAI_MODEL} as WorkflowData;
}
