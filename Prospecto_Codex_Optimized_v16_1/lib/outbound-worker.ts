import 'server-only';
import {adminDb} from './admin';
import {connectionTransport,allowedRecipient} from './smtp';
import {canonicalJSON,personalize,type CampaignStep} from './outreach';
import {signLink} from './server-crypto';
import {must,presentationActive} from './workflow-services';
export async function processOutbound(workspace:string|null=null,limit=3){
 const db=adminDb();let processed=0;
 for(let n=0;n<Math.min(limit,5);n++){
  const job=must(await db.rpc('claim_outbound',{w:workspace})) as any;if(!job)break;
  const launch=must(await db.from('campaign_launches').select('*').eq('workspace_id',job.workspace_id).eq('id',job.launch_id).single());
  const finish=async(outcome:string,next:number|null=null,delay=0,note='',message='')=>must(await db.rpc('finish_outbound',{job:job.id,outcome,provider_message:message,next_index:next,delay_seconds:delay,job_note:note}));
  try{
   if(!await presentationActive(db,job.workspace_id)){await finish('needs_attention',null,0,'Akses presentasi berakhir. Aktifkan akses yang berlaku sebelum meluncurkan kembali.');continue;}
   const current=must(await db.rpc('worker_campaign_state',{w:job.workspace_id,c:launch.campaign_id}));
   const actor=(await db.from('workspace_memberships').select('role').eq('workspace_id',job.workspace_id).eq('user_id',launch.actor_id).maybeSingle()).data;
   if(!actor||!['owner','admin'].includes(actor.role)||!current.ready||!current.approved||canonicalJSON(current.snapshot)!==canonicalJSON(launch.snapshot)){await finish('needs_attention',null,0,'Isi, audience, atau approval berubah. Tinjau ulang sebelum mengirim.');continue;}
   const steps=launch.snapshot.campaign.steps as CampaignStep[],step=steps[job.step_index];if(!step)throw new Error('Invalid step');const next=job.step_index+1<steps.length?job.step_index+1:null;
   if(step.kind==='wait'){await finish('completed',next,step.days*86400,`Jeda ${step.days} hari dijadwalkan`);processed++;continue;}
   if(step.kind==='linkedin_manual'){await finish('manual',null,0,'Tugas LinkedIn manual: '+step.body.slice(0,500));processed++;continue;}
   if(step.kind==='condition'){
    const reply=await db.from('outbound_events').select('id').eq('workspace_id',job.workspace_id).eq('campaign_id',launch.campaign_id).eq('contact_id',job.contact_id).eq('event_type','replied').gte('occurred_at',launch.created_at).limit(1);
    if(reply.error)throw new Error('Reply state unavailable');const yes=step.condition==='replied'?!!reply.data?.length:!reply.data?.length;const target=yes?step.then_step:step.else_step;await finish('completed',target==null?null:target-1,0,`Kondisi ${step.condition}: ${yes?'benar':'salah'}, berdasarkan event tersimpan`);processed++;continue;
   }
   const entry=launch.snapshot.audience.find((v:any)=>v.contact.id===job.contact_id);if(!entry)throw new Error('Recipient missing');const contact={...entry.contact,companies:entry.company};
   const channel=must(await db.from('channel_connections').select('*').eq('workspace_id',job.workspace_id).eq('id',launch.connection_id).single());
   if(channel.status!=='verified'||new Date(channel.verified_at)>new Date(launch.created_at)){await finish('needs_attention',null,0,'Sender berubah. Buat peluncuran baru setelah review.');continue;}
   const suppression=await db.from('smtp_suppressions').select('id').eq('sender_email',channel.sender_email).eq('email',contact.email).limit(1);if(suppression.error)throw new Error('Suppression state unavailable');
   if(suppression.data?.length||!allowedRecipient(contact.email)){await finish('blocked',null,0,'Penerima disuppress atau di luar alamat uji preview lokal.');continue;}
   const subject=personalize(step.subject,contact,launch.snapshot.campaign.sender_name),body=personalize(step.body,contact,launch.snapshot.campaign.sender_name);
   if(subject.unresolved.length||body.unresolved.length||/[\r\n]/.test(subject.text)){await finish('needs_attention',null,0,'Personalisasi atau subject tidak valid.');continue;}
   const still=must(await db.from('campaign_launches').select('state').eq('id',launch.id).single());if(!['queued','active'].includes(still.state)){await db.from('outbound_jobs').update({state:still.state==='canceled'?'canceled':'pending'}).eq('id',job.id);continue;}
   const {transport,config}=await connectionTransport(db,launch.connection_id);const unsubscribe=(process.env.APP_BASE_URL||'http://127.0.0.1:3000')+'/unsubscribe?job='+job.id+'&token='+signLink('unsubscribe',job.id);
   try{
    const result=await transport.sendMail({from:{name:config.name,address:config.from},to:contact.email,subject:subject.text,text:body.text+'\n\nBerhenti menerima email dari pengirim ini:\n'+unsubscribe,messageId:`<${job.id}@${config.from.split('@')[1]}>`,headers:{'List-Unsubscribe':`<${unsubscribe}>`},disableFileAccess:true,disableUrlAccess:true});
    if(!result.accepted?.length)throw new Error('SMTP did not accept message');
    // Do not retry if SMTP accepted but the database acknowledgement is lost.
    await finish('sent',next,0,'Diterima server SMTP; status delivered/open belum diketahui.',result.messageId);
   }catch(e){
    const err=e as {responseCode?:number;command?:string};const safeRetry=!!err.responseCode&&err.responseCode>=400&&err.responseCode<500&&err.command!=='DATA'&&job.attempts<3;
    if(safeRetry)must(await db.from('outbound_jobs').update({state:'pending',due_at:new Date(Date.now()*1+2**job.attempts*60000).toISOString(),note:'Gangguan SMTP sementara sebelum DATA. Retry dijadwalkan.'}).eq('id',job.id));
    else await finish('needs_attention',null,0,'Hasil SMTP perlu diperiksa. Tidak diulang otomatis untuk menghindari email ganda.');
   }finally{transport.close();}
   processed++;
  }catch{await finish('needs_attention',null,0,'Worker belum berhasil. Periksa sender/approval sebelum melanjutkan.');await db.from('operational_events').insert({workspace_id:job.workspace_id,kind:'outbound_worker',error_code:'processing_failed'});}
 }
 return {processed};
}
