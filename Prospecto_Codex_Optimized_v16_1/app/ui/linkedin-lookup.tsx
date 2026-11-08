'use client';

import {useState} from 'react';

type Target = {pic_id:string} | {run_id:string;name:string;source_url:string};

export default function LinkedinLookup({workspaceId,productId,companyId,target,available}:{
  workspaceId:string;productId:string;companyId:string;target:Target;available:boolean;
}) {
  const [links,setLinks] = useState<string[]>();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');

  async function search() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/research',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({workspace_id:workspaceId,product_id:productId,company_id:companyId,kind:'pic',linkedin:target}),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Pencarian tautan LinkedIn belum berhasil.');
        return;
      }
      setLinks(result.links);
    } catch {
      setError('Pencarian tautan LinkedIn belum berhasil. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;
  return <div>
    <button className="btn" type="button" onClick={search} disabled={busy || !!links?.length}>
      {busy?'Mencari tautan LinkedIn…':links?.length?'Tautan LinkedIn ditemukan':'Cari tautan LinkedIn'}
    </button>
    <div role="status">
      {error&&<p>{error}</p>}
      {links?.length===0&&<p className="muted">Belum ada hasil web yang mencantumkan nama dan perusahaan ini.</p>}
      {!!links?.length&&<>
        <p className="muted">Kemungkinan profil dari hasil web. Cocokkan identitas dan jabatan saat membuka tautannya.</p>
        <ul>{links.map((url,index)=><li key={url}><a href={url} target="_blank" rel="noreferrer">Buka profil LinkedIn{links.length>1?` ${index+1}`:''}</a></li>)}</ul>
      </>}
    </div>
  </div>;
}
