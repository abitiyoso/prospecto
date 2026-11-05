import Auth from '@/app/ui/auth';
import { configured } from '@/lib/supabase';
export const dynamic='force-dynamic';
export default function PasswordPage(){return <Auth configured={configured()} initialMode="update"/>;}
