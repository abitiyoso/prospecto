import {NextResponse} from 'next/server';
import {adminDb} from '@/lib/admin';
export const dynamic='force-dynamic';
export async function GET(){try{const r=await adminDb().from('commercial_catalog').select('id').limit(1);if(r.error)throw new Error();return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({ok:false},{status:503,headers:{'Cache-Control':'no-store'}});}}
