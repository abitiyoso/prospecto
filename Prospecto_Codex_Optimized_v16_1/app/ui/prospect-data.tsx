'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Building2,Plus} from 'lucide-react';
import ResearchPanel from './research-panel';
import CompanyAssessment from './company-assessment';
import LinkedinLookup from './linkedin-lookup';
import {ChoiceField,BuyerRolesField} from './product-fields';
import {targetIndustries} from '@/lib/product-choices';
import {matchesICP,type Company,type PIC} from '@/lib/prospect';
import type {ResearchCandidate} from '@/lib/research';
import type {DashboardData} from '@/lib/domain';

const stages = ['Produk & target','Pilih perusahaan','Temukan PIC','Siapkan campaign'] as const;
type Step = 1|2|3|4;
type Props = {
  data:DashboardData;
  initialProductId?:string;
  busy:boolean;
  onAddProduct:()=>void;
  onLeads:()=>void;
  onCampaignCreated:(id:string)=>void;
  command:(action:string,extra?:Record<string,unknown>)=>Promise<any>;
  run:(job:()=>Promise<void>,message?:string)=>Promise<void>;
};
type Profile = {candidate:ResearchCandidate|null;observed_at:string|null};

export default function ProspectData({data,command,run,busy,initialProductId,onAddProduct,onLeads,onCampaignCreated}:Props){
  const [step,setStep] = useState<Step>(1);
  const [productId,setProductId] = useState(initialProductId||data.products[0]?.id||'');
  const [companyId,setCompanyId] = useState('');
  const [selectedDomain,setSelectedDomain] = useState('');
  const [companyMode,setCompanyMode] = useState<'web'|'saved'>('web');
  const [filter,setFilter] = useState('');
  const [applyICP,setApplyICP] = useState(false);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [profileError,setProfileError] = useState('');
  const [showPicSearch,setShowPicSearch] = useState(false);
  const [focusSavedPics,setFocusSavedPics] = useState(false);
  const [picToComplete,setPicToComplete] = useState('');
  const [selectedPICs,setSelectedPICs] = useState<string[]>([]);
  const [campaignName,setCampaignName] = useState('');
  const [creating,setCreating] = useState(false);
  const flow = useRef<HTMLDivElement>(null);
  const focusStep = useRef(false);
  const draftRequest = useRef<{key:string;id:string}|null>(null);

  const prospects = data.prospects||{companies:[],icps:[],pics:[],runs:[],researchAvailable:false};
  const product = data.products.find(item=>item.id===productId);
  const company = prospects.companies.find(item=>item.id===companyId||!!selectedDomain&&item.domain===selectedDomain);
  const icp = prospects.icps.find(item=>item.product_id===productId);
  const pics = prospects.pics.filter(item=>item.company_id===company?.id);
  const filtered = prospects.companies
    .filter(item=>!applyICP||!icp||matchesICP(item,icp))
    .filter(item=>[item.name,item.domain,item.industry,item.location].join(' ').toLowerCase().includes(filter.trim().toLowerCase()));
  const chosen = prospects.pics.filter(item=>selectedPICs.includes(item.id));
  const researchAvailable = !!prospects.researchAvailable;
  const isReady = (pic:PIC)=>pic.verification==='verified'&&!!pic.email&&!!pic.source_url;
  const blocked = chosen.filter(pic=>!isReady(pic));
  const draftName = campaignName.trim()||('Prospek '+(product?.name||'')).slice(0,160);

  useEffect(()=>{
    if(!focusStep.current)return;
    focusStep.current=false;
    const top = flow.current?.getBoundingClientRect().top;
    if(top!==undefined&&(top<86||top>window.innerHeight-160))flow.current?.scrollIntoView({block:'start'});
    flow.current?.querySelector<HTMLElement>('[data-prospect-step="'+step+'"]')?.focus({preventScroll:true});
  },[step]);

  useEffect(()=>{
    if(step!==3||!focusSavedPics||!pics.length)return;
    document.getElementById('prospect-saved-pics')?.focus();
    setFocusSavedPics(false);
  },[step,focusSavedPics,pics.length]);

  useEffect(()=>{
    if(step!==3||!picToComplete)return;
    const editor = document.getElementById('prospect-pic-edit-'+picToComplete) as HTMLDetailsElement|null;
    if(editor){
      editor.open=true;
      editor.querySelector('summary')?.focus();
    }
    setPicToComplete('');
  },[step,picToComplete]);

  useEffect(()=>{
    let active=true;
    setProfile(null);
    setProfileError('');
    if(company)void command('company.profile',{product_id:productId,company_id:company.id})
      .then(result=>{if(active)setProfile(result);})
      .catch(()=>{if(active)setProfileError('Profil belum dapat dibaca.');});
    return()=>{active=false;};
  },[company?.id,productId]);

  function goTo(next:Step){
    if(next===step)return;
    focusStep.current=true;
    setStep(next);
  }

  function changeProduct(id:string){
    setProductId(id);
    setCompanyId('');
    setSelectedDomain('');
    setSelectedPICs([]);
    setCampaignName('');
    setCompanyMode('web');
    setFilter('');
    setApplyICP(false);
  }

  function selectCompany(value:Company){
    setCompanyId(value.id);
    setSelectedDomain('');
    setShowPicSearch(false);
    setFocusSavedPics(false);
    goTo(3);
  }

  function selectNewCompany(domain:string){
    setCompanyId('');
    setSelectedDomain(domain);
    setShowPicSearch(false);
    setFocusSavedPics(false);
    goTo(3);
  }

  function togglePic(id:string,checked:boolean){
    setSelectedPICs(previous=>checked?[...previous,id]:previous.filter(item=>item!==id));
  }

  function continueToCompanies(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const mode = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
    void run(async()=>{
      await command('icp.save',{values:{...Object.fromEntries(values),product_id:productId}});
      setCompanyMode(mode==='saved'||!researchAvailable?'saved':'web');
      goTo(2);
    },'Target pencarian tersimpan.');
  }

  const submit = (action:string,extra:Record<string,unknown>={})=>(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void run(async()=>{await command(action,{values:{...values,...extra}});},'Data tersimpan.');
  };

  async function createCampaign(){
    if(creating||!chosen.length||blocked.length||chosen.length!==selectedPICs.length)return;
    setCreating(true);
    try{
      await run(async()=>{
        const key = productId+':'+[...selectedPICs].sort().join(',')+':'+draftName;
        if(draftRequest.current?.key!==key)draftRequest.current={key,id:crypto.randomUUID()};
        const result = await command('campaign.from_pics',{
          product_id:productId,pic_ids:selectedPICs,name:draftName,request_id:draftRequest.current.id,
        });
        onCampaignCreated(result.id);
      },'Draft dibuat dari PIC terpilih. Tinjau pesan dan penerima sebelum peluncuran.');
    }finally{
      setCreating(false);
    }
  }

  if(!product)return <section className="card p-card">
    <h2>Mulai dengan produk Anda</h2>
    <p>Tambahkan produk agar pencarian tahu perusahaan dan peran pembeli yang Anda tuju.</p>
    <button className="btn btn-primary" onClick={onAddProduct}>Tambah produk pertama</button>
  </section>;

  const researchProps = {
    workspaceId:data.active.id,productId,productName:product.name,
    available:researchAvailable,runs:prospects.runs||[],command,run,
  };

  return <div className="prospect-journey" ref={flow}>
    <ol className="prospect-steps" aria-label="Langkah pencarian prospek">
      {stages.map((label,index)=>{
        const number = (index+1) as Step;
        return <li key={label} aria-current={number===step?'step':undefined}>
          {number<step
            ? <button type="button" onClick={()=>goTo(number)}>{number}. {label}</button>
            : <span>{number}. {label}</span>}
        </li>;
      })}
    </ol>

    <section className="card p-card prospect-stage prospect-target" hidden={step!==1} aria-labelledby="prospect-target">
      <h2 id="prospect-target" data-prospect-step="1" tabIndex={-1}>Pilih produk dan target</h2>
      <p>Mulai dari produk yang Anda tawarkan. Industri, lokasi, dan peran membantu mempersempit pencarian.</p>
      <label>Produk untuk pencarian
        <select value={productId} onChange={event=>changeProduct(event.target.value)}>
          {data.products.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <form key={productId} onSubmit={continueToCompanies}>
        <div className="p-form-grid">
          <ChoiceField name="industry" label="Target industri" options={targetIndustries} defaultValue={icp?.industry||product.industry}/>
          <label>Lokasi (opsional)<input name="location" defaultValue={icp?.location} placeholder="Misalnya: Jakarta" maxLength={500}/></label>
        </div>
        <BuyerRolesField defaultValue={icp?.buyer_roles||product.buyer_roles}/>
        <details className="target-advanced">
          <summary>Filter tambahan (opsional)</summary>
          <div className="p-form-grid">
            <label>Karyawan minimum<input name="employee_min" type="number" min={1} defaultValue={icp?.employee_min??''}/></label>
            <label>Karyawan maksimum<input name="employee_max" type="number" min={1} defaultValue={icp?.employee_max??''}/></label>
          </div>
          <label>Pengecualian<textarea name="exclusions" defaultValue={icp?.exclusions}
            placeholder="Nama, domain, industri, atau lokasi. Pisahkan dengan koma." maxLength={4000}/></label>
        </details>
        <div className="p-actions">
          <button className="btn btn-primary" type="submit" value="web" disabled={busy}>Lanjut ke perusahaan <ArrowRight size={15}/></button>
          {prospects.companies.length>0&&<button className="btn" type="submit" value="saved" disabled={busy}>Gunakan perusahaan tersimpan</button>}
        </div>
      </form>
    </section>

    <section className="prospect-stage" hidden={step!==2} aria-labelledby="prospect-companies">
      <div className="prospect-stage-heading">
        <button type="button" className="text-button" onClick={()=>goTo(1)}><ArrowLeft size={15}/> Kembali ke target</button>
        <h2 id="prospect-companies" data-prospect-step="2" tabIndex={-1}>Pilih perusahaan</h2>
        <p className="muted">Produk: {product.name}{icp?.industry?' · '+icp.industry:''}{icp?.location?' · '+icp.location:''}</p>
        <div className="p-actions" role="group" aria-label="Sumber perusahaan">
          <button type="button" className={companyMode==='web'?'btn btn-soft':'btn'} aria-pressed={companyMode==='web'} onClick={()=>setCompanyMode('web')}>Cari di web</button>
          <button type="button" className={companyMode==='saved'?'btn btn-soft':'btn'} aria-pressed={companyMode==='saved'} onClick={()=>setCompanyMode('saved')}>
            Perusahaan tersimpan ({prospects.companies.length})
          </button>
        </div>
      </div>
      <div hidden={companyMode!=='web'}>
        <ResearchPanel key={productId} {...researchProps} onCompanySaved={selectNewCompany}/>
      </div>
      <section className="card p-card" hidden={companyMode!=='saved'} aria-label="Perusahaan tersimpan">
        <h3>Perusahaan tersimpan</h3>
        <p>Pilih satu perusahaan untuk membuka daftar PIC dan pencarian pengambil keputusan.</p>
        {prospects.companies.length>0&&<div className="p-form-grid">
          <label>Filter daftar perusahaan<input value={filter} onChange={event=>setFilter(event.target.value)} placeholder="Nama atau domain"/></label>
          {icp&&<label className="outreach-toggle"><input type="checkbox" checked={applyICP} onChange={event=>setApplyICP(event.target.checked)}/> Cocok dengan target tersimpan</label>}
        </div>}
        {filtered.map(item=><button type="button" className={'p-product-item '+(company?.id===item.id?'selected':'')} key={item.id}
          onClick={()=>selectCompany(item)}>
          <Building2 size={18}/><span><b>{item.name}</b><small>{item.domain}</small></span><ArrowRight size={15}/>
        </button>)}
        {!filtered.length&&<p className="p-small-empty">{prospects.companies.length
          ?'Tidak ada perusahaan yang cocok dengan filter ini.'
          :'Belum ada perusahaan tersimpan. Cari di web atau tambahkan perusahaan di bawah.'}</p>}
        <details>
          <summary className="p-link"><Plus size={16}/> Tambah perusahaan manual</summary>
          <form onSubmit={submit('company.save')}>
            <label>Nama perusahaan<input name="name" required maxLength={160}/></label>
            <label>Domain<input name="domain" required placeholder="perusahaan.co.id" maxLength={253}/></label>
            <label>Industri<input name="industry" maxLength={160}/></label>
            <label>Lokasi<input name="location" maxLength={160}/></label>
            <label>Jumlah karyawan<input name="employee_count" type="number" min={1}/></label>
            <label>URL sumber publik<input name="source_url" type="url" pattern="https://.*" maxLength={2000}/></label>
            <button className="btn btn-primary" disabled={busy}>Simpan perusahaan</button>
          </form>
        </details>
      </section>
    </section>

    <section className="prospect-stage" hidden={step!==3} aria-labelledby="prospect-pics">
      <div className="prospect-stage-heading">
        <button type="button" className="text-button" onClick={()=>goTo(2)}><ArrowLeft size={15}/> Kembali ke perusahaan</button>
        <h2 id="prospect-pics" data-prospect-step="3" tabIndex={-1}>{company?'Temukan PIC di '+company.name:'Temukan PIC'}</h2>
        <p className="muted">Produk: {product.name}{company?' · '+company.domain:''}</p>
      </div>
      {!company?<p role="status">Memuat perusahaan yang dipilih…</p>:<>
        <details className="card p-card prospect-context">
          <summary>Profil dan kecocokan {company.name}</summary>
          {profileError?<p role="status">{profileError}</p>:profile?.candidate?<div>
            <CompanyAssessment candidate={profile.candidate} productName={product.name}/>
            <a href={profile.candidate.source_url} target="_blank" rel="noreferrer">Sumber profil perusahaan</a>
            {profile.observed_at&&<p className="muted">Ditinjau {new Date(profile.observed_at).toLocaleString('id-ID')}</p>}
          </div>:<p className="muted">{profile?'Belum ada profil dari riset produk ini.':'Memuat profil…'}</p>}
          {company.source_url&&<a href={company.source_url} target="_blank" rel="noreferrer">Sumber perusahaan</a>}
        </details>

        {pics.length>0&&<button type="button" className="btn prospect-more-search" aria-expanded={showPicSearch}
          aria-controls="prospect-pic-web" onClick={()=>setShowPicSearch(previous=>!previous)}>
          {showPicSearch?'Tutup pencarian PIC':'Cari PIC lain di web'}
        </button>}
        <div id="prospect-pic-web" hidden={pics.length>0&&!showPicSearch}>
          <ResearchPanel key={productId+':'+company.id} {...researchProps} company={company} onPicSaved={()=>{
            setShowPicSearch(false);
            setFocusSavedPics(true);
          }}/>
        </div>
        {pics.length>0&&<section className="card p-card saved-pics" aria-labelledby="prospect-saved-pics">
          <h3 id="prospect-saved-pics" tabIndex={-1}>PIC tersimpan · {pics.length}</h3>
          <p>Cari tautan profil untuk meninjau PIC, atau pilih PIC untuk draft campaign.</p>
          {pics.map(pic=>{
            const promoted = !!pic.email&&data.contacts.some(contact=>contact.email===pic.email);
            return <article className="p-mail-preview" key={pic.id}>
              <div className="p-row">
                <h4>{pic.name}</h4>
                <span className="tag">{isReady(pic)?'Siap untuk email':pic.verification==='rejected'?'Ditolak':'Perlu ditinjau'}</span>
              </div>
              <p>{pic.title}<br/>{pic.email||'Email bisnis belum tersedia'}</p>
              <div className="p-actions">
                {pic.verification!=='rejected'&&<LinkedinLookup key={pic.name} workspaceId={data.active.id} productId={productId}
                  companyId={company.id} target={{pic_id:pic.id}} available={researchAvailable}/>}
                <label className="outreach-toggle">
                  <input type="checkbox" aria-label={'Pilih PIC '+pic.name+' untuk campaign'}
                    checked={selectedPICs.includes(pic.id)} onChange={event=>togglePic(pic.id,event.target.checked)}/>
                  Pilih untuk campaign
                </label>
              </div>
              <details>
                <summary>Bukti dan tindakan PIC</summary>
                <p>{pic.notes}</p>
                <a href={pic.source_url} target="_blank" rel="noreferrer">Buka bukti publik</a>
                <div className="p-actions">
                  <button className="btn" disabled={busy} onClick={()=>run(async()=>{
                    await command('pic.save',{id:pic.id,values:{...pic,verification:pic.verification==='verified'?'candidate':'verified'}});
                  },'Status peninjauan diperbarui.')}>{pic.verification==='verified'?'Batalkan verifikasi':'Tandai diverifikasi manual'}</button>
                  <button className="btn" disabled={busy||!isReady(pic)||promoted} onClick={()=>run(async()=>{
                    await command('pic.promote',{id:pic.id});
                  },'Kontak tersimpan di Leads.')}>{promoted?'Sudah di Leads':'Simpan ke Leads'}</button>
                  {promoted&&<button className="btn" onClick={onLeads}>Buka Leads</button>}
                </div>
              </details>
              <details id={'prospect-pic-edit-'+pic.id}>
                <summary>Lengkapi atau koreksi data PIC</summary>
                <form onSubmit={event=>{
                  event.preventDefault();
                  const values = Object.fromEntries(new FormData(event.currentTarget));
                  void run(async()=>{await command('pic.save',{id:pic.id,values:{...pic,...values,verification:'candidate'}});},'PIC diperbarui. Tinjau ulang sumbernya.');
                }}>
                  <label>Nama PIC<input name="name" defaultValue={pic.name} required maxLength={160}/></label>
                  <label>Jabatan<input name="title" defaultValue={pic.title} maxLength={160}/></label>
                  <label>Email bisnis yang tercantum<input name="email" type="email" defaultValue={pic.email} maxLength={254}/></label>
                  <label>URL bukti publik<input name="source_url" type="url" pattern="https://.*" required defaultValue={pic.source_url} maxLength={2000}/></label>
                  <button className="btn" disabled={busy}>Simpan perubahan PIC</button>
                </form>
              </details>
            </article>;
          })}
        </section>}
        <details className="card p-card prospect-context">
          <summary className="p-link"><Plus size={16}/> Tambah PIC manual</summary>
          <form onSubmit={submit('pic.save',{company_id:company.id})}>
            <label>Nama PIC<input name="name" required maxLength={160}/></label>
            <label>Jabatan<input name="title" maxLength={160}/></label>
            <label>Email bisnis (opsional)<input name="email" type="email" maxLength={254}/></label>
            <label>URL bukti publik<input name="source_url" type="url" pattern="https://.*" required maxLength={2000}/></label>
            <label>Catatan bukti<textarea name="notes" maxLength={4000}/></label>
            <button className="btn btn-primary" disabled={busy}>Simpan PIC</button>
          </form>
        </details>
        {chosen.length>0&&<section className="card p-card prospect-selection" aria-label="PIC dipilih">
          <div className="p-row">
            <p><b>{chosen.length} PIC dipilih</b>{blocked.length>0?' · '+blocked.length+' perlu dilengkapi':''}</p>
            <button type="button" className="btn btn-primary" onClick={()=>goTo(4)}>Tinjau PIC untuk campaign <ArrowRight size={15}/></button>
          </div>
        </section>}
      </>}
    </section>

    <section className="prospect-stage" hidden={step!==4} aria-labelledby="prospect-campaign">
      <div className="prospect-stage-heading">
        <button type="button" className="text-button" onClick={()=>goTo(3)}><ArrowLeft size={15}/> Kembali ke PIC</button>
        <h2 id="prospect-campaign" data-prospect-step="4" tabIndex={-1}>Siapkan draft campaign</h2>
        <p className="muted">Produk: {product.name}</p>
      </div>
      <div className="card p-card" aria-label="Campaign dari PIC terpilih">
        <h3>Penerima dipilih · {chosen.length}</h3>
        {chosen.map(pic=>{
          const employer=prospects.companies.find(item=>item.id===pic.company_id);
          return <div className="p-row" key={pic.id}>
            <span><b>{pic.name}</b>{employer?' · '+employer.name:''}
              <small className="p-block">{pic.email||'Email belum tersedia'} · {isReady(pic)?'Siap untuk email':'Perlu ditinjau'}</small>
            </span>
            <div className="p-actions">
              {!isReady(pic)&&employer&&<button type="button" className="btn" onClick={()=>{
                setPicToComplete(pic.id);
                selectCompany(employer);
              }}>Lengkapi PIC</button>}
              <button type="button" className="btn" aria-label={'Hapus pilihan PIC '+pic.name} onClick={()=>togglePic(pic.id,false)}>Hapus pilihan</button>
            </div>
          </div>;
        })}
        {!chosen.length&&<p>Pilih minimal satu PIC untuk menyiapkan campaign.</p>}
        {blocked.length>0&&<p className="notice" role="status">{blocked.length} PIC perlu email bisnis, bukti, dan verifikasi manual sebelum bisa masuk draft.</p>}
        <label>Nama draft campaign<input value={campaignName} placeholder={draftName} maxLength={160} onChange={event=>setCampaignName(event.target.value)}/></label>
        <button type="button" className="btn btn-primary" disabled={creating||busy||!chosen.length||!!blocked.length||chosen.length!==selectedPICs.length}
          onClick={createCampaign}>{creating?'Membuat draft…':'Buat draft campaign'}</button>
        <p className="muted">Setelah draft dibuat, tinjau pesan dan penerimanya di Campaigns.</p>
      </div>
    </section>
  </div>;
}
