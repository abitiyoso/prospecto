import {NextRequest,NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {readBody,sameOrigin} from '@/lib/request';
import {spreadsheetCsv} from '@/lib/documents';
import {parseCsv} from '@/lib/domain';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});
 try{const db=await supabase();if(!(await db.auth.getUser()).data.user)return NextResponse.json({error:'Silakan masuk'},{status:401});const bytes=await readBody(req,11*1024*1024);const form=await new Request(req.url,{method:'POST',headers:req.headers,body:bytes as BodyInit}).formData();const file=form.get('file');if(!(file instanceof File)||!file.name.toLowerCase().endsWith('.xlsx'))throw new Error('Pilih XLSX yang valid');const csv=await spreadsheetCsv(new Uint8Array(await file.arrayBuffer()));if(new TextEncoder().encode(csv).length>2000000)throw new Error('Hasil impor maksimal 2 MB');const [headers]=parseCsv(csv);return NextResponse.json({csv,headers});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'XLSX belum dapat dibaca'},{status:400});}
}
