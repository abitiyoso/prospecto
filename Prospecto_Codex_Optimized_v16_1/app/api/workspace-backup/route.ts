import {NextRequest,NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {readBody,sameOrigin} from '@/lib/request';
import {uuid} from '@/lib/domain';
import {backupWorkspace,restoreWorkspace} from '@/lib/workspace-backup';
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});try{const db=await supabase(),{data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Silakan masuk'},{status:401});
 if(req.headers.get('content-type')?.includes('application/json')){const v=JSON.parse(new TextDecoder().decode(await readBody(req,2000))),w=uuid.parse(v.workspace_id);const role=(await db.from('workspace_memberships').select('role').eq('workspace_id',w).eq('user_id',user.id).single()).data?.role;if(!['owner','admin'].includes(role||''))return NextResponse.json({error:'Backup membutuhkan owner atau admin'},{status:403});const bytes=await backupWorkspace(db,w);return new NextResponse(bytes as BodyInit,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="prospecto-workspace-backup.zip"','Cache-Control':'no-store'}});}
 const raw=await readBody(req,11*1024*1024),form=await new Request(req.url,{method:'POST',headers:req.headers,body:raw as BodyInit}).formData();const file=form.get('file');if(!(file instanceof File))throw new Error('Pilih arsip backup');return NextResponse.json(await restoreWorkspace(db,new Uint8Array(await file.arrayBuffer()),user.id));
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Backup/restore belum berhasil'},{status:400});}}
