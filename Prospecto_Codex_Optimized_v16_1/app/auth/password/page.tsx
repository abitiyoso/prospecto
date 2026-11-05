import Auth from '@/app/ui/auth';
import { configured,supabase } from '@/lib/supabase';
export const dynamic='force-dynamic';
export default async function PasswordPage(){
 if(!configured())return <Auth configured={false}/>;
 const db=await supabase();const {data:{user}}=await db.auth.getUser();
 return user?<Auth configured initialMode="update"/>:<Auth configured initialMode="reset" error="Buka tautan pemulihan terbaru dari email terlebih dahulu."/>;
}
