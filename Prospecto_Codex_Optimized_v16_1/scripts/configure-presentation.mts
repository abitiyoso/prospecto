// Explicit administrator utility; never sends email or launches campaigns.
import {adminDb} from '../lib/admin';
import {presentationEligible,saveSender,must} from '../lib/workflow-services';
import {platformSmtp} from '../lib/smtp';
process.loadEnvFile('.env.local');
const workspace=process.argv[2];if(!/^[a-f0-9-]{36}$/.test(workspace||''))throw new Error('Specify workspace UUID');
const db=adminDb(),owner=must(await db.from('workspace_memberships').select('user_id').eq('workspace_id',workspace).eq('role','owner').single());
const user=must(await db.auth.admin.getUserById(owner.user_id)).user;
if(!presentationEligible(user.email||''))throw new Error('Owner is not enabled in presentation environment');
must(await db.from('presentation_access').upsert({workspace_id:workspace,granted_by:user.id},{onConflict:'workspace_id',ignoreDuplicates:true}));
const existing=must(await db.from('channel_connections').select('status').eq('workspace_id',workspace));
if(!existing.some(c=>c.status==='verified'))await saveSender(workspace,user.id,platformSmtp());
console.log(JSON.stringify({presentationAccessConfigured:true,senderVerified:true,campaignsLaunched:0,emailsSent:0}));
