import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {processOutbound} from '@/lib/outbound-worker';
export async function POST(req:NextRequest){
 const supplied=req.headers.get('authorization')||'',expected='Bearer '+(process.env.WORKER_SECRET||'');
 if(!process.env.WORKER_SECRET||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:'Tidak diizinkan'},{status:401});
 if(req.nextUrl.searchParams.get('check')==='1')return NextResponse.json({ok:true,queueProcessed:false});
 try{return NextResponse.json(await processOutbound(null,3));}catch{return NextResponse.json({error:'Worker belum berhasil'},{status:503});}
}
