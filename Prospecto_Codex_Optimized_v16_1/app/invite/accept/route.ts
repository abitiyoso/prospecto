import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {supabase} from '@/lib/supabase';
import {readBody,sameOrigin,requestOrigin} from '@/lib/request';
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});try{const f=new URLSearchParams(new TextDecoder().decode(await readBody(req,2000))),token=f.get('token')||'';if(!/^[a-f0-9]{64}$/.test(token))throw new Error();const db=await supabase();if(!(await db.auth.getUser()).data.user)throw new Error();const r=await db.rpc('accept_workspace_invite',{raw_token:token});if(r.error)throw new Error();(await cookies()).set('prospecto-workspace',r.data,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});return NextResponse.redirect(new URL('/app',requestOrigin(req)),303);}catch{return NextResponse.redirect(new URL('/app?auth=expired',requestOrigin(req)),303);}}
