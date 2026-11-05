import {emailToken} from '@/lib/auth-email';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function Confirm({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const parsed=emailToken.safeParse(await searchParams);
 return <main className="auth-panel"><section className="card auth-card"><img src="/assets/prospecto-logo-approved.png" alt="Prospecto by Elenio" width={190}/>{parsed.success?<><h2>{parsed.data.type==='recovery'?'Atur ulang kata sandi':'Konfirmasi email Anda'}</h2><p>Tekan tombol di bawah untuk melanjutkan. Tautan hanya dapat digunakan sekali.</p><form action="/auth/verify" method="post"><input type="hidden" name="token_hash" value={parsed.data.token_hash}/><input type="hidden" name="type" value={parsed.data.type}/><button className="btn btn-primary">{parsed.data.type==='recovery'?'Lanjut atur ulang kata sandi':'Konfirmasi email'}</button></form></>:<><h2>Tautan tidak valid</h2><p>Minta email konfirmasi atau pemulihan yang baru.</p><a className="btn" href="/app">Kembali ke login</a></>}</section></main>;
}
