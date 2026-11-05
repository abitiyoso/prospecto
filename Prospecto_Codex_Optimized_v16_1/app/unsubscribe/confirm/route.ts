import {NextRequest,NextResponse} from 'next/server';
import {validLink} from '@/lib/server-crypto';
import {adminDb} from '@/lib/admin';
import {readBody,sameOrigin,requestOrigin} from '@/lib/request';
import {uuid} from '@/lib/domain';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});
 try{const f=new URLSearchParams(new TextDecoder().decode(await readBody(req,2000))),job=uuid.parse(f.get('job'));if(!validLink('unsubscribe',job,f.get('token')||''))return NextResponse.json({error:'Tautan tidak valid'},{status:400});const db=adminDb();const {data:j}=await db.from('outbound_jobs').select('*,campaign_launches(campaign_id,snapshot,connection_id)').eq('id',job).single();if(!j)throw new Error();const launch=j.campaign_launches as any,contact=launch.snapshot.audience.find((a:any)=>a.contact.id===j.contact_id)?.contact;const {data:c}=await db.from('channel_connections').select('sender_email').eq('id',launch.connection_id).single();if(!contact||!c)throw new Error();const r=await db.from('smtp_suppressions').upsert({workspace_id:j.workspace_id,email:contact.email,sender_email:c.sender_email,reason:'unsubscribed'},{onConflict:'workspace_id,email,sender_email'});if(r.error)throw new Error();await db.from('outbound_events').upsert({workspace_id:j.workspace_id,campaign_id:launch.campaign_id,contact_id:j.contact_id,provider:'unsubscribe',provider_event_id:job,event_type:'unsubscribed',occurred_at:new Date().toISOString()},{onConflict:'provider,provider_event_id',ignoreDuplicates:true});return NextResponse.redirect(new URL('/unsubscribe?done=1',requestOrigin(req)),303);}catch{return NextResponse.json({error:'Permintaan belum dapat diproses'},{status:400});}
}
