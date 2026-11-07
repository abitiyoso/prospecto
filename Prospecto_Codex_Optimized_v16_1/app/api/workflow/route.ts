import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {AIProviderError} from '@/lib/leo-contract';
import {supabase} from '@/lib/supabase';
import {adminDb} from '@/lib/admin';
import {sameOrigin,readBody} from '@/lib/request';
import {uuid} from '@/lib/domain';
import {indexSource,generateDraft,presentationEligible,presentationActive,saveSender,sendTest,createInvite,must} from '@/lib/workflow-services';
import {allowedRecipient,platformSmtp} from '@/lib/smtp';
import {processOutbound} from '@/lib/outbound-worker';
import {launchRecipient} from '@/lib/outreach-state';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});
 try{
  const input=JSON.parse(new TextDecoder().decode(await readBody(req,25000)));const w=uuid.parse(input.workspace_id),action=z.string().max(80).parse(input.action);
  const db=await supabase(),{data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Silakan masuk kembali'},{status:401});
  const member=(await db.from('workspace_memberships').select('role').eq('workspace_id',w).eq('user_id',user.id).single()).data;if(!member)return NextResponse.json({error:'Workspace tidak diizinkan'},{status:403});
  const ok=(v:unknown={ok:true})=>NextResponse.json(v);const isAdmin=['owner','admin'].includes(member.role);
  if(action==='kms.search')return ok({results:must(await db.rpc('search_knowledge',{w,p:uuid.parse(input.product_id),q:z.string().max(200).parse(input.query)}))});
  if(action==='kms.index')return ok(await indexSource(db,w,uuid.parse(input.source_id),user.id));
  if(action==='leo.generate')return ok(await generateDraft(db,w,uuid.parse(input.product_id),user.id,z.string().trim().max(2000).parse(input.instruction||''),z.enum(['template','openai','ai']).parse(input.engine),input.campaign_id?uuid.parse(input.campaign_id):undefined));
  if(action==='outreach.history'){
   const c=uuid.parse(input.campaign_id),offset=z.number().int().min(0).max(1000000).parse(input.offset||0);
   must(await db.from('campaigns').select('id').eq('workspace_id',w).eq('id',c).single());
   const page=await db.from('outbound_jobs').select('id,launch_id,contact_id,step_index,state,due_at,attempts,note,message_id,campaign_launches!inner(campaign_id)',{count:'exact'}).eq('workspace_id',w).eq('campaign_launches.campaign_id',c).order('due_at',{ascending:false}).order('id').range(offset,offset+99);must(page);return ok({jobs:page.data,total:page.count||0});
  }
  if(action==='team.change'){must(await db.rpc('manage_workspace_member',{w,target:uuid.parse(input.user_id),new_role:z.enum(['admin','member']).parse(input.role)}));return ok();}
  if(action==='team.remove'){must(await db.rpc('manage_workspace_member',{w,target:uuid.parse(input.user_id),new_role:null}));return ok();}
  if(action==='invite.revoke'){must(await db.rpc('revoke_workspace_invite',{w,invitation:uuid.parse(input.invite_id)}));return ok();}
  if(!isAdmin)return NextResponse.json({error:'Tindakan ini membutuhkan owner atau admin'},{status:403});
  const admin=adminDb();
  if(action==='presentation.activate'){
   if(!presentationEligible(user.email||''))return NextResponse.json({error:'Akses presentasi belum diizinkan untuk akun ini'},{status:403});
   const existing=(await admin.from('presentation_access').select('expires_at').eq('workspace_id',w).maybeSingle()).data;
   if(!existing)must(await admin.from('presentation_access').insert({workspace_id:w,granted_by:user.id}));return ok();
  }
  if(action==='smtp.connect'){if(input.preset){if(!await presentationActive(admin,w))throw new Error('Aktifkan akses presentasi dahulu');return ok(await saveSender(w,user.id,platformSmtp()));}return ok(await saveSender(w,user.id,input.values));}
  if(action==='smtp.test')return ok(await sendTest(w,z.email().parse(input.email),user.id));
  if(action==='smtp.disconnect'){must(await admin.from('campaign_launches').update({state:'paused'}).eq('workspace_id',w).in('state',['queued','active']));must(await admin.from('channel_connections').update({status:'disconnected'}).eq('workspace_id',w));return ok();}
  if(action==='invite.create')return ok(await createInvite(w,user.id,z.email().parse(input.email),input.send===true));
  if(action==='suppression.add'){
   const connection=must(await admin.from('channel_connections').select('sender_email').eq('workspace_id',w).single());must(await admin.from('smtp_suppressions').upsert({workspace_id:w,email:z.email().parse(input.email).toLowerCase(),sender_email:connection.sender_email,reason:'manual'},{onConflict:'workspace_id,email,sender_email'}));return ok();
  }
  if(action==='outreach.launch'){
   if(input.confirm!==true||input.consent!==true)throw new Error('Review dan persetujuan audience wajib sebelum peluncuran');
   if(!await presentationActive(admin,w))throw new Error('Aktifkan akses presentasi untuk meluncurkan tanpa pembayaran');
   const c=uuid.parse(input.campaign_id);const audience=must(await db.from('campaign_audience').select('contact_id').eq('workspace_id',w).eq('campaign_id',c));
   if(!audience.length)throw new Error('Audience kosong');const contacts=must(await db.from('contacts').select('email').eq('workspace_id',w).in('id',audience.map(a=>a.contact_id)));
   if(contacts.some(c=>!allowedRecipient(c.email)))throw new Error('Ada penerima di luar daftar alamat uji. Pilih penerima yang diizinkan atau minta pengelola mengaktifkan pengiriman live.');
   const scheduled=input.scheduled_at?z.string().datetime({offset:true}).parse(input.scheduled_at):null;
   const id=must(await admin.rpc('launch_campaign',{w,c,actor:user.id,start_at:scheduled}));return ok({id});
  }
  if(action==='outreach.process')return ok(await processOutbound(w,3));
  if(['outreach.pause','outreach.resume','outreach.cancel','outreach.expedite'].includes(action)){
   const id=uuid.parse(input.launch_id),launch=must(await admin.from('campaign_launches').select('*').eq('workspace_id',w).eq('id',id).single());
   if(action==='outreach.expedite'){
    if(!await presentationActive(admin,w))throw new Error('Perubahan jadwal ini khusus akses presentasi');must(await admin.from('outbound_jobs').update({due_at:new Date().toISOString(),note:'Jadwal dimajukan manual untuk presentasi'}).eq('workspace_id',w).eq('launch_id',id).eq('state','pending'));return ok();
   }
   const state=action==='outreach.pause'?'paused':action==='outreach.cancel'?'canceled':'queued';
   if(['completed','canceled','needs_attention'].includes(launch.state))throw new Error('Peluncuran ini sudah selesai atau membutuhkan review baru');
   must(await admin.from('campaign_launches').update({state}).eq('workspace_id',w).eq('id',id));if(state==='canceled')must(await admin.from('outbound_jobs').update({state:'canceled',note:'Dibatalkan pengguna sebelum diproses'}).eq('workspace_id',w).eq('launch_id',id).in('state',['pending','manual']));return ok();
  }
  if(action==='outreach.manualDone'){
   const job=must(await admin.from('outbound_jobs').select('*,campaign_launches(snapshot,state)').eq('workspace_id',w).eq('id',uuid.parse(input.job_id)).single());if(job.state!=='manual'||input.confirm!==true)throw new Error('Tugas manual perlu dikonfirmasi');
   const launch=job.campaign_launches as any;if(!['active','queued','paused'].includes(launch.state))throw new Error('Peluncuran tidak aktif');const next=job.step_index+1<launch.snapshot.campaign.steps.length?job.step_index+1:null;must(await admin.rpc('finish_outbound',{job:job.id,outcome:'completed',next_index:next,job_note:'Tugas manual ditandai selesai oleh pengguna'}));return ok();
  }
  if(action==='event.record'){
   const type=z.enum(['replied','positive_reply','meeting','bounced','unsubscribed']).parse(input.type),note=z.string().trim().min(1).max(2000).parse(input.note),job=must(await admin.from('outbound_jobs').select('*,campaign_launches(campaign_id,sender_email,snapshot)').eq('workspace_id',w).eq('id',uuid.parse(input.job_id)).eq('state','sent').single());const launch=job.campaign_launches as any;
   const event=must(await admin.from('outbound_events').insert({workspace_id:w,campaign_id:launch.campaign_id,contact_id:job.contact_id,provider:'manual',provider_event_id:crypto.randomUUID(),event_type:type,occurred_at:new Date().toISOString()}).select('id').single());must(await admin.from('manual_event_notes').insert({event_id:event.id,workspace_id:w,note,actor_id:user.id}));
   if(['bounced','unsubscribed'].includes(type)){const recipient=launchRecipient(launch,job.contact_id);must(await admin.from('smtp_suppressions').upsert({workspace_id:w,email:recipient.email,sender_email:recipient.senderEmail,reason:type==='bounced'?'bounce':'unsubscribed'},{onConflict:'workspace_id,email,sender_email'}));}return ok();
  }
  return NextResponse.json({error:'Tindakan belum tersedia'},{status:400});
 }catch(e){if(e instanceof AIProviderError)return NextResponse.json({error:e.message,code:e.code},{status:e.status});return NextResponse.json({error:e instanceof z.ZodError?'Isian belum valid':e instanceof Error&&!/password|credential|secret|token|apikey/i.test(e.message)?e.message:'Operasi belum berhasil. Periksa koneksi server.'},{status:400});}
}
