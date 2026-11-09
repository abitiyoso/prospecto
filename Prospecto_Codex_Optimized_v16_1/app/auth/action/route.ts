import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { readBody, sameOrigin, requestOrigin } from '@/lib/request';
export async function POST(req:NextRequest) {
 if (!sameOrigin(req)) return NextResponse.json({error:'Origin tidak valid'},{status:403});
 try {
  const body=JSON.parse(new TextDecoder().decode(await readBody(req,20_000))); const db=await supabase();
  const action=z.enum(['login','signup','reset','resend','update','logout']).parse(body.action);
  if(action==='logout') {const {error}=await db.auth.signOut();if(error)throw error;return NextResponse.json({ok:true});}
  if(action==='update') { const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:'Buka tautan pemulihan terlebih dahulu'},{status:401});const {error}=await db.auth.updateUser({password:z.string().min(12).max(128).parse(body.password)});if(error)throw error;await db.auth.signOut();return NextResponse.json({message:'Kata sandi diperbarui. Silakan masuk kembali.'}); }
  const email=z.string().email().max(254).parse(body.email);
  if(action==='reset') {const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:requestOrigin(req)+'/auth/confirm'});if(error)throw error;return NextResponse.json({message:'Jika email terdaftar, tautan pemulihan akan dikirim.'});}
  if(action==='resend'){const {error}=await db.auth.resend({type:'signup',email,options:{emailRedirectTo:requestOrigin(req)+'/auth/confirm'}});if(error)throw error;return NextResponse.json({message:'Jika akun perlu dikonfirmasi, email konfirmasi baru akan dikirim.'});}
  const password=z.string().min(action==='signup'?12:1).max(128).parse(body.password);
  const result=action==='login'?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password,options:{emailRedirectTo:requestOrigin(req)+'/auth/confirm'}});
  if(result.error){
   if(result.error.status===429)throw result.error;
   if(action==='login'&&result.error.code==='email_not_confirmed')return NextResponse.json({error:'Email belum dikonfirmasi. Buka tautan di inbox atau pilih Kirim ulang konfirmasi.'},{status:400});
   return NextResponse.json({error:action==='login'?'Email atau kata sandi tidak sesuai.':'Pendaftaran belum berhasil. Coba lagi atau gunakan email lain.'},{status:400});
  }
  return NextResponse.json(result.data.session?{ok:true}:{message:'Periksa email Anda untuk mengonfirmasi akun, lalu masuk.'});
 } catch(e) {if(e&&typeof e==='object'&&'status' in e&&e.status===429)return NextResponse.json({error:'Permintaan email terlalu sering. Tunggu setidaknya satu menit sebelum mencoba lagi.'},{status:429});return NextResponse.json({error:'Permintaan belum berhasil. Periksa isian dan koneksi layanan.'},{status:400});}
}

