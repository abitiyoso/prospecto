import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { assertUpload,uuid } from '@/lib/domain';
import { readBody, sameOrigin, requestOrigin } from '@/lib/request';
import {readOfficeArchive} from '@/lib/documents';
export async function POST(req:NextRequest) {
 if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});
 if(Number(req.headers.get('content-length')||0)>11*1024*1024)return NextResponse.json({error:'Berkas terlalu besar'},{status:413});
 try {
  const db=await supabase();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Silakan masuk'},{status:401});
  const body=await readBody(req,11*1024*1024);
  const form=await new Request(req.url,{method:'POST',headers:req.headers,body:body as BodyInit}).formData();const w=uuid.parse(form.get('workspace_id'));const p=uuid.parse(form.get('product_id'));const file=form.get('file');if(!(file instanceof File))throw new Error('Pilih berkas');
  const {data:product}=await db.from('products').select('id').eq('workspace_id',w).eq('id',p).single();if(!product)return NextResponse.json({error:'Produk tidak diizinkan'},{status:403});
  const bytes=new Uint8Array(await file.arrayBuffer());assertUpload(file.name,file.type,bytes);
  if(file.name.toLowerCase().endsWith('.docx'))await readOfficeArchive(bytes,'word/document.xml');
  const id=crypto.randomUUID();const path=`${w}/${p}/${id}`;
  const {error:metaError}=await db.from('knowledge_sources').insert({id,workspace_id:w,product_id:p,title:file.name.slice(0,200),kind:'file',status:'pending',upload_state:'uploading',storage_path:path});if(metaError)throw new Error('Metadata berkas tidak dapat disimpan');
  const {error}=await db.storage.from('product-kms').upload(path,bytes,{contentType:file.type||'text/plain',upsert:false});
  if(error){await db.from('knowledge_sources').update({upload_state:'failed'}).eq('workspace_id',w).eq('id',id);throw new Error('Upload belum berhasil. Silakan coba lagi.');}
  const {error:stateError}=await db.from('knowledge_sources').update({upload_state:'stored'}).eq('workspace_id',w).eq('id',id);
  if(stateError)throw new Error('Berkas diterima tetapi status belum tersimpan. Muat ulang dan hubungi admin workspace.');
  return NextResponse.json({ok:true});
 } catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Upload gagal'},{status:400});}
}

