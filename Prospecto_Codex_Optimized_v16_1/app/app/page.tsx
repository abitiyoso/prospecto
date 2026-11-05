import { cookies } from 'next/headers';
import { configured, supabase } from '@/lib/supabase';
import Dashboard from '@/app/ui/dashboard';
import Auth from '@/app/ui/auth';
import type { DashboardData, Workspace } from '@/lib/domain';
import { collectRows } from '@/lib/data';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{mode?: string;auth?:string}> }) {
  const query=await searchParams;
  const mode=query.mode==='signup'?'signup':'login';
  if (!configured()) return <Auth configured={false}/>;
  const db = await supabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return <Auth configured initialMode={mode} error={query.auth==='expired'?'Tautan sudah kedaluwarsa atau tidak valid. Silakan minta tautan baru.':''}/>;
  const memberships = await db.from('workspace_memberships').select('workspace_id,role,workspaces(id,name)').eq('user_id',user.id);
  if (memberships.error) return <Auth configured error="Workspace belum dapat dimuat. Periksa koneksi dan migrasi database."/>;
  const workspaces = memberships.data.map(m => ({ ...(m.workspaces as unknown as {id:string;name:string}), role: m.role })) as Workspace[];
  if (!workspaces.length) return <Auth configured onboarding/>;
  const activeId = (await cookies()).get('prospecto-workspace')?.value;
  const active = workspaces.find(w=>w.id===activeId) || workspaces[0];
  const results = await Promise.all([
    collectRows((from,to)=>db.from('products').select('*').eq('workspace_id',active.id).order('created_at').order('id').range(from,to)),
    collectRows((from,to)=>db.from('knowledge_sources').select('*').eq('workspace_id',active.id).order('created_at').order('id').range(from,to)),
    collectRows((from,to)=>db.from('contacts').select('*,companies(name,domain)').eq('workspace_id',active.id).order('created_at').order('id').range(from,to)),
    collectRows((from,to)=>db.from('campaigns').select('*,campaign_audience(contact_id)').eq('workspace_id',active.id).order('created_at').order('id').range(from,to)),
  ]);
  const prospects={researchAvailable:!!process.env.FIRECRAWL_API_KEY,runs:await db.from('research_runs').select('*').eq('workspace_id',active.id).order('created_at',{ascending:false}).limit(20).then(r=>{if(r.error)throw new Error('Riwayat riset belum dapat dimuat');return r.data;}),icps:await collectRows((a,b)=>db.from('icp_profiles').select('*').eq('workspace_id',active.id).order('id').range(a,b)),companies:await collectRows((a,b)=>db.from('companies').select('*').eq('workspace_id',active.id).order('id').range(a,b)),pics:await collectRows((a,b)=>db.from('pic_candidates').select('*').eq('workspace_id',active.id).order('id').range(a,b))};
  const data = { prospects, workspaces, active, products:results[0], sources:results[1], contacts:results[2], campaigns:results[3], email:user.email||'' } as DashboardData;
  return <Dashboard key={active.id} data={data}/>;
}




