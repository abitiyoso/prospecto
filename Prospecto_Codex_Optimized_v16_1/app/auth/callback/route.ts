import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requestOrigin } from '@/lib/request';
export async function GET(req:NextRequest) {
 const code=req.nextUrl.searchParams.get('code');
 if(code) {const db=await supabase();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(req.nextUrl.searchParams.get('next')==='/auth/password'?'/auth/password':'/app',requestOrigin(req)));}
 return NextResponse.redirect(new URL('/app?auth=expired',requestOrigin(req)));
}

