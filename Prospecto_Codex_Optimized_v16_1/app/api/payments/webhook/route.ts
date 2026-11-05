import {NextResponse} from 'next/server';
export async function POST(){
 // No provider is connected: never parse an unverified payload into a paid mutation.
 return NextResponse.json({error:'Payment webhook adapter belum tersedia'},{status:503});
}
