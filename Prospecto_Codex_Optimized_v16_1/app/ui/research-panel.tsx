'use client';

import {useEffect,useRef,useState} from 'react';
import {Search} from 'lucide-react';
import CompanyAssessment from './company-assessment';
import LinkedinLookup from './linkedin-lookup';
import type {Company} from '@/lib/prospect';
import type {ResearchRun,WebEvidence,ResearchCandidate} from '@/lib/research';

type Review = {source:WebEvidence;candidate?:ResearchCandidate};
type Props = {
  workspaceId:string;
  productId:string;
  productName:string;
  company?:Company;
  available:boolean;
  runs:ResearchRun[];
  onCompanySaved?:(domain:string)=>void;
  onPicSaved?:()=>void;
  command:(action:string,extra?:Record<string,unknown>)=>Promise<unknown>;
  run:(job:()=>Promise<void>,message?:string)=>Promise<void>;
};

export default function ResearchPanel({
  workspaceId,productId,productName,company,available,runs,onCompanySaved,onPicSaved,command,run,
}:Props){
  const kind = company ? 'pic' : 'company';
  const [query,setQuery] = useState('');
  const [busy,setBusy] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [current,setCurrent] = useState<ResearchRun>();
  const [review,setReview] = useState<Review>();
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const latest = current || runs.find(result =>
    result.product_id === productId && result.kind === kind &&
    (!company || result.query.startsWith('site:'+company.domain+' ') ||
      result.query.startsWith('"'+company.name+'" ')),
  );
  const candidates = (latest?.results.flatMap(source=>source.candidates||[])||[])
    .sort((a,b)=>(b.fit_reasons?.length||0)-(a.fit_reasons?.length||0));

  useEffect(()=>{
    if(review)reviewHeading.current?.focus();
  },[review]);

  async function search(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy||saving||!available)return;
    setBusy(true);
    setReview(undefined);
    setError('');
    try{
      await run(async()=>{
        try{
          const response = await fetch('/api/research',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              workspace_id:workspaceId,product_id:productId,company_id:company?.id,
              kind,query,scope:company?'public':'company',
            }),
          });
          const body = await response.json();
          if(!response.ok)throw Error(body.error||'Pencarian belum berhasil.');
          setCurrent(body.run);
        }catch(error){
          setError(error instanceof Error ? error.message : 'Pencarian belum berhasil.');
          throw error;
        }
      },'Pencarian selesai.');
    }finally{
      setBusy(false);
    }
  }

  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!review||saving)return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    try{
      await run(async()=>{
        await command(company?'pic.save':'company.save',{
          values:{...values,...(company?{company_id:company.id,verification:'candidate'}:{}),source_url:review.source.url},
        });
        setReview(undefined);
        if(company)onPicSaved?.();
        else onCompanySaved?.(String(values.domain).trim().toLowerCase());
      },company?'PIC tersimpan.':'Perusahaan tersimpan. Lanjutkan dengan mencari PIC.');
    }finally{
      setSaving(false);
    }
  }

  return <section className="card p-card research-panel" aria-label={company?'Cari PIC di web':'Cari perusahaan di web'}>
    <h3>{company?'Cari PIC di web':'Cari perusahaan di web'}</h3>
    <p>{company
      ? 'Cari pengambil keputusan di '+company.name+' dari sumber publik.'
      : 'Cari calon pembeli yang sesuai dengan '+productName+' dan target yang sudah Anda tentukan.'}</p>
    <form onSubmit={search}>
      <label>{company?'Jabatan atau nama PIC (opsional)':'Kata kunci perusahaan (opsional)'}
        <input value={query} maxLength={300} onChange={e=>setQuery(e.target.value)}
          placeholder={company?'Misalnya: direktur operasional':'Misalnya: pengelola kos di Jakarta'}/>
      </label>
      <button className="btn btn-primary" disabled={!available||busy||saving}>
        <Search size={16}/> {busy?'Mencari di web…':company?'Cari PIC di '+company.name:'Cari perusahaan di web'}
      </button>
    </form>
    {busy&&<p role="status">Sedang membaca sumber publik. Hasil akan muncul di sini.</p>}
    {error&&<p className="notice" role="alert">{error}</p>}
    {!available&&<p className="notice">Pencarian web belum terhubung. Anda masih bisa memakai data tersimpan atau menambahkannya secara manual.</p>}

    {review&&<form key={review.source.url+':'+(review.candidate?.name||'manual')} className="research-review" onSubmit={save}>
      <h3 ref={reviewHeading} tabIndex={-1}>{company?'Tinjau kandidat PIC':'Tinjau perusahaan'}</h3>
      <p className="muted">Cocokkan nama dan data dengan sumber.</p>
      <label>{company?'Nama PIC':'Nama perusahaan'}<input name="name" defaultValue={review.candidate?.name} required maxLength={160}/></label>
      {company?<>
        <label>Jabatan<input name="title" defaultValue={review.candidate?.title} maxLength={160}/></label>
        <label>Email bisnis yang tercantum (opsional)<input name="email" type="email" defaultValue={review.candidate?.email} maxLength={254}/></label>
        <label>Catatan bukti<textarea name="notes" defaultValue={review.candidate?.evidence||review.source.description} maxLength={4000}/></label>
        <p className="muted">Simpan dulu jika email belum tersedia. Campaign email memerlukan alamat bisnis yang telah ditinjau.</p>
      </>:<>
        <label>Domain perusahaan<input name="domain" defaultValue={review.candidate?.domain||new URL(review.source.url).hostname.replace(/^www\./,'')} required maxLength={253}/></label>
        <label>Industri (bila tercantum)<input name="industry" defaultValue={review.candidate?.industry} maxLength={160}/></label>
        <label>Lokasi (bila tercantum)<input name="location" defaultValue={review.candidate?.location} maxLength={160}/></label>
      </>}
      <label>URL bukti<input value={review.source.url} readOnly/></label>
      <div className="p-actions">
        <button className="btn btn-primary" disabled={saving}>{saving?'Menyimpan…':company?'Simpan PIC':'Simpan & lanjut ke PIC'}</button>
        <button className="btn" type="button" disabled={saving} onClick={()=>setReview(undefined)}>Batal</button>
      </div>
    </form>}

    {latest&&!busy&&<div>
      <h4 role="status">{company?'Kandidat PIC':'Kandidat perusahaan'} ditemukan · {candidates.length}</h4>
      <p className="muted">Dicari {new Date(latest.created_at).toLocaleString('id-ID')}</p>
      {latest.status==='failed'&&<p className="notice">Pencarian ini belum berhasil. Coba lagi atau ubah kata kunci.</p>}
      {latest.error_code.startsWith('names_')&&<p className="notice">{latest.error_code==='names_ai_connection_failed'
        ?'Sumber ditemukan, tetapi layanan AI untuk mengenali nama sedang tidak terhubung. Tinjau sumber di bawah atau coba lagi nanti.'
        :'Sumber ditemukan. Tinjau sumber di bawah jika nama kandidat belum muncul.'}</p>}
      {latest.status==='completed'&&!candidates.length&&!latest.error_code&&<p className="p-small-empty">{company
        ?'Belum ada nama dan jabatan PIC yang dapat dibuktikan. Coba jabatan lain atau tinjau sumber.'
        :'Belum ada perusahaan yang dapat dibuktikan. Coba target lebih spesifik atau masukkan nama perusahaan.'}</p>}
      {candidates.map(candidate=>{
        const source=latest.results.find(item=>item.url===candidate.source_url);
        return <article className="p-mail-preview research-candidate" data-testid="research-candidate" key={candidate.source_url+':'+candidate.name}>
          <h4>{candidate.name}</h4>
          <p>{company?candidate.title:[candidate.industry,candidate.location].filter(Boolean).join(' · ')||candidate.domain}</p>
          {company&&<p>{candidate.email||'Email bisnis belum tercantum di sumber ini.'}</p>}
          {!company&&candidate.profile_quote&&<p>{candidate.profile_quote}</p>}
          <details>
            <summary>{company?'Relevansi peran dan bukti':'Profil, alasan kecocokan, dan bukti'}</summary>
            <CompanyAssessment candidate={candidate} productName={productName} pic={!!company}/>
            <blockquote>{candidate.evidence}</blockquote>
            <a href={candidate.source_url} target="_blank" rel="noreferrer">Buka sumber publik</a>
          </details>
          <div className="p-actions">
            {source&&<button className="btn btn-primary" type="button" onClick={()=>setReview({source,candidate})}>
              {company?'Tinjau PIC ':'Pilih perusahaan '}{candidate.name}
            </button>}
            {company&&<LinkedinLookup key={latest.id} workspaceId={workspaceId} productId={productId} companyId={company.id}
              target={{run_id:latest.id,name:candidate.name,source_url:candidate.source_url}} available={available}/>}
          </div>
        </article>;
      })}
      {latest.results.length>0&&<details className="research-sources" open={candidates.length===0||undefined}>
        <summary>Sumber pencarian · {latest.results.length}</summary>
        {latest.results.map(source=><div className="p-source" key={source.url}>
          <div>
            <b>{source.title}</b><p>{source.description}</p>
            <a href={source.url} target="_blank" rel="noreferrer">Buka sumber publik</a>
            <div><button className="btn" type="button" onClick={()=>setReview({source})}>Tinjau sumber manual</button></div>
          </div>
        </div>)}
      </details>}
    </div>}
  </section>;
}
