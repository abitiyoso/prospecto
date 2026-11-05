import {NextRequest,NextResponse} from 'next/server';
import {emailToken,emailDestination} from '@/lib/auth-email';
import {supabase} from '@/lib/supabase';
import {readBody,requestOrigin,sameOrigin} from '@/lib/request';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Origin tidak valid'},{status:403});
 let destination='/app?auth=expired';
 try{
  const body=new URLSearchParams(new TextDecoder().decode(await readBody(req,2000)));
  const v=emailToken.parse(Object.fromEntries(body));const db=await supabase();
  const {error}=await db.auth.verifyOtp(v);
  if(!error)destination=emailDestination(v.type);
 }catch{/* Invalid/consumed tokens never establish a session. */}
 const response=NextResponse.redirect(new URL(destination,requestOrigin(req)),303);
 response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
