
/* Prospecto v16 — UX completion layer. Preserves logo, navigation, subscription and existing interaction system. */
(function(){
 const stage = () => !state.products.length ? 'product' : !state.accounts.length ? 'prospects' : !state.leads.length ? 'pic' : 'campaign';
 const bestProduct = () => state.products.find(p=>p.id===state.productId)||state.products[0];
 const localized = text => esc(String(text||''));
 ui.v16LeadIds = [];
 ui.v16SavedProduct = false;
 // Product save advances to the next meaningful customer action rather than returning to a blank Home.
 const oldSaveProduct = saveProductForm;
 saveProductForm=function(form){
   const previous=state.products.length;
   oldSaveProduct(form);
   ui.v16SavedProduct=true;
   ui.page='products';
   render();
   toast(previous?'Produk diperbarui':'Produk disimpan. Lanjutkan ke pencarian prospek.');
 };
 // The Home primary action is contextual. It is not permanently stuck on Add Product.
 v11Hero=function(){
   const p=bestProduct(), s=stage();
   const action=s==='product'?{label:'Buat produk pertama',data:'data-act="newProduct"'}:
     s==='prospects'?{label:'Cari prospek untuk produk ini',data:'data-page="targets"'}:
     s==='pic'?{label:'Temukan PIC perusahaan',data:'data-act="v16ToPIC"'}:
     {label:'Buat campaign untuk leads',data:'data-page="campaigns"'};
   const subtitle=p?`Produk aktif: ${localized(p.name)}. Lanjutkan proses sampai calon pelanggan siap dihubungi.`:'Definisikan produk, temukan perusahaan dan PIC yang relevan, lalu buat campaign bersama LEO.';
   return `<section class="v15-hero"><div class="v15-hero-copy"><span class="v15-eyebrow">${ic('spark',13)} AI SALES WORKSPACE</span><h2>Ubah produk menjadi <em>peluang bisnis.</em></h2><p>${subtitle}</p><div class="v15-hero-actions"><button class="btn btn-primary v15-primary" ${action.data}>${ic('arrow',15)} ${action.label}</button><button class="btn" data-page="products">Kelola produk ${ic('chevron',14)}</button></div><div class="v15-hero-foot"><span>${ic('checkcircle',15)} Produk & KMS</span><span>${ic('checkcircle',15)} Cari perusahaan & PIC</span><span>${ic('checkcircle',15)} Campaign</span></div></div><div class="v15-hero-asset"><img src="${V15_ASSETS.hero}" alt="Profesional B2B menggunakan laptop di ruang kerja" decoding="async"/></div></section>`;
 };
 const oldProductsPage=productsPage;
 productsPage=function(){
   let html=oldProductsPage();
   const p=bestProduct(),start=html.indexOf('<div class="v15-product-asset">'),end=start>=0?html.indexOf('</section>',start):-1;
   if(start>=0&&end>=0){
     const visual=`<div class="v16-kms-asset"><div class="v16-kms-window"><div class="v16-windowbar">${ic('box',17)} Product knowledge</div><div class="v16-kms-row"><span>Nama produk</span><b>${localized(p?.name||'Produk pertama Anda')}</b></div><div class="v16-kms-row"><span>Target industri</span><b>${localized(p?.industry||'Pilih industri')}</b></div><div class="v16-kms-row"><span>Buyer persona</span><b>${localized((p?.roles||'Pilih PIC').split(',')[0])}</b></div><div class="v16-kms-row"><span>Knowledge sources</span><b>${p?state.knowledge.filter(k=>k.productId===p.id).length:0} sumber</b></div><div class="v16-kms-end">${ic('spark',14)} LEO menggunakan informasi produk ini</div></div></div>`;
     html=html.slice(0,start)+visual+html.slice(end);
   }
   if(ui.v16SavedProduct&&p){
     const notice=`<section class="v16-next"><div><span class="v16-kicker">Produk tersimpan</span><h3>${localized(p.name)} siap digunakan untuk pencarian prospek</h3><p>Berikutnya, tentukan industri, lokasi, dan ukuran perusahaan. LEO membantu memprioritaskan akun yang relevan.</p></div><button class="btn btn-primary" data-act="v16ContinueProspects">Cari prospek ${ic('arrow',16)}</button></section>`;
     const idx=html.indexOf('<section class="v15-product-banner">');
     if(idx>=0)html=html.slice(0,idx)+notice+html.slice(idx);
     else html=notice+html;
   }
   return html;
 };
 // Never bake contact names, scores or generated brand artifacts into prospect artwork.
 const oldTargetsPage=targetsPage;
 targetsPage=function(){
   let html=oldTargetsPage();
   const start=html.indexOf('<div class="v15-target-photo">'),end=start>=0?html.indexOf('</section>',start):-1;
   if(start>=0&&end>=0){
     const candidates=(state.accounts.length?state.accounts:state.discoveries).slice(0,3);
     const rows=(candidates.length?candidates:[{company:'Perusahaan yang sesuai ICP',industry:'Target industri',score:92},{company:'Decision maker potensial',industry:'Buyer persona',score:88}]).map(a=>`<div class="v16-target-item"><div class="symbol">${ic('building',17)}</div><div><b>${localized(a.company)}</b><small>${localized(a.industry||'B2B Company')} · ${localized(a.location||'Indonesia')}</small></div><span class="score">${Math.round(a.score||88)}% fit</span></div>`).join('');
     const visual=`<div class="v16-target-asset"><div class="v16-target-board"><div class="top"><span>${ic('target',15)} Company shortlist</span><span class="v16-preview-badge">${ic('spark',12)} AI matching</span></div>${rows}</div></div>`;
     html=html.slice(0,start)+visual+html.slice(end);
   }
   return html;
 };
 // Match sequence preview to the actual template object; no hard-coded "3 steps".
 v15TemplateArt=function(index){
   const t=(ui.showMoreTemplates?campaignsTemplates:campaignsTemplates.slice(0,3))[index]||campaignsTemplates[0];
   const steps=t.steps||[];
   return `<div class="v15-template-window"><div class="v15-template-title">${ic('layers',16)} ${localized(t.name)} <span>${steps.length} langkah</span></div>${steps.slice(0,4).map((s,i)=>`<div class="v15-template-track"><span class="v15-track-dot"></span><b>${String(i+1).padStart(2,'0')}</b><strong>${localized(s)}</strong></div>`).join('')}</div>`;
 };
 // Campaign hero must not imply its static mail copy was generated from the active product.
 const oldCampaignsPage=campaignsPage;
 campaignsPage=function(){
   let html=oldCampaignsPage();
   const p=bestProduct();
   html=html.replace('3-step sequence','Sequence overview');
   html=html.replace('Dari ide menjadi campaign yang siap dikirim.','Dari ide menjadi campaign yang siap direview.');
   html=html.replace('A smarter way to manage operations',p?`Percakapan awal tentang ${localized(p.name)}`:'Tentukan produk Anda untuk menyusun pesan');
   html=html.replace('Your team may be managing multiple locations. Here’s an idea that could simplify the work...',p?localized((p.pain||p.value||'Tawarkan solusi yang relevan berdasarkan kebutuhan perusahaan.').slice(0,125)):'Buat produk dan tentukan audiens untuk menyusun isi email.');
   return html;
 };
 // Explicit lead selection and handoff to campaign audience.
 const oldDatabasePage=databasePage;
 databasePage=function(){
   let html=oldDatabasePage();
   if(ui.leadTab==='contacts'){
     const selected=ui.v16LeadIds.filter(id=>state.leads.some(l=>l.id===id));
     const toolbar=`<div class="v16-audience-action"><div><strong>${selected.length} kontak dipilih untuk campaign</strong><p>Pilih PIC dari tabel. Identitas dan kontak perlu diverifikasi sebelum peluncuran.</p></div><button class="btn btn-primary" data-act="v16FromLeads" ${selected.length?'':'disabled'}>Buat campaign ${ic('arrow',15)}</button></div>`;
     const idx=html.indexOf('<div class="card" style="margin-top:18px">');
     if(idx>=0)html=html.slice(0,idx)+toolbar+html.slice(idx);
     html=html.replace('<tr><th>Name</th><th>Company</th>',`<tr><th><input class="v16-select-ct" type="checkbox" id="v16SelectAll" aria-label="Pilih semua kontak" ${selected.length===state.leads.length&&state.leads.length?'checked':''}></th><th>Name</th><th>Company</th>`);
     state.leads.filter(x=>`${x.company} ${x.name} ${x.role} ${x.email}`.toLowerCase().includes((ui.leadSearch||'').toLowerCase())).forEach(l=>{
       const match=`<tr><td><strong>${localized(l.name||'—')}</strong></td>`;
       html=html.replace(match,`<tr><td><input class="v16-select-ct" type="checkbox" data-v16-lead="${localized(l.id)}" aria-label="Pilih ${localized(l.name||l.company)}" ${selected.includes(l.id)?'checked':''}></td><td><strong>${localized(l.name||'—')}</strong></td>`);
     });
     html=html.replace('<table class="table">','<table class="table v16-table">');
   }
   return html;
 };
 // Role suggestions are not identities. Do not represent them as verified PICs.
 const oldPIC = picSimplePage;
 picSimplePage=function(){
   let html=oldPIC();
   const clarification=`<div class="v16-audience-action"><div><strong>Riset PIC: tiga tingkat informasi</strong><p>Rekomendasi jabatan → kandidat bernama dengan URL sumber → kontak bisnis terverifikasi. Jabatan saja belum berarti seseorang ditemukan.</p></div></div>`;
   const pos=html.indexOf('<div class="card v7-pic-main">');
   if(pos>=0)html=html.slice(0,pos)+clarification+html.slice(pos);
   return html;
 };
 // Campaign review clarifies steps, missing checks, and which actions need a real sending backend.
 const oldSimpleCampaign = simpleCampaignPage;
 simpleCampaignPage=function(){
   const c=activeCampaign();if(!c)return oldSimpleCampaign();
   let html=oldSimpleCampaign();
   if(ui.campaignTab!=='review')return html;
   const audience=(c.audience||[]).map(x=>state.leads.find(l=>l.id===x)).filter(Boolean);
   const validated=audience.filter(l=>l.verified&&l.email);
   const mail=c.steps.find(s=>s.type==='email');
   const senderConnected=['gmail','outlook'].some(k=>state.connections?.[k]?.status==='connected' && state.connections[k]?.verified===true);
   const checks=[['Produk & konteks KMS',!!state.products.find(x=>x.id===c.productId),'Tentukan produk yang dijual'],['Audience dipilih',audience.length>0,`${audience.length} kontak dipilih`],['Kontak bisnis terverifikasi',audience.length>0&&validated.length===audience.length,`${validated.length} dari ${audience.length} kontak lengkap`],['Isi email',!!(mail?.subject&&mail?.body),'Subjek dan pesan perlu ditinjau'],['Pengirim terverifikasi',senderConnected,'Perlu integrasi OAuth backend']];
   const ready=checks.every(x=>x[1]);
   const panel=`<section class="v16-preflight"><h3>Checklist sebelum campaign dijalankan</h3><p>Setelah membuat pesan, pastikan audience, sumber kontak, dan pengirim sudah siap.</p>${checks.map(c=>`<div class="v16-preflight-row"><span>${localized(c[0])}</span><span class="tag ${c[1]?'good':'warn'}">${c[1]?'Siap':localized(c[2])}</span></div>`).join('')}<div class="v16-preflight-footer"><button class="btn btn-primary" data-act="v16SaveAndReview">${ic('check',14)} Simpan untuk review</button><button class="btn" disabled aria-disabled="true">Jadwalkan / kirim</button><span class="v16-preflight-note">${ready?'Struktur campaign siap ditinjau. Pengiriman baru berjalan setelah backend dan sender resmi aktif.':'Peluncuran belum tersedia sampai pemeriksaan selesai. Tidak ada email yang dikirim dari HTML ini.'}</span></div></section>`;
   return html+panel;
 };
 // Preserve existing action routing; add only context-preserving steps.
 const oldAction = action;
 action=function(act,el){
   if(act==='v16ContinueProspects'){ui.v16SavedProduct=false;ui.prospectView='companies';navigate('targets');return;}
   if(act==='v16ToPIC'){ui.prospectView='pic';navigate('targets');return;}
   if(act==='v16FromLeads'){
     const ids=ui.v16LeadIds.filter(k=>state.leads.some(l=>l.id===k));
     if(!ids.length){toast('Pilih setidaknya satu kontak');return;}
     if(!state.products.length){toast('Tambahkan produk terlebih dahulu');navigate('products');return;}
     makeCampaign('intro');
     const c=activeCampaign();if(c){c.audience=[...ids];ui.campaignTab='audience';save();render();toast(`${ids.length} kontak masuk ke audience campaign`);}
     return;
   }
   if(act==='v16SaveAndReview'){
     const c=activeCampaign();if(!c)return;
     c.status='Draft';c.reviewedAt=new Date().toISOString();
     noteEvent(`Campaign disimpan untuk review: ${c.name}`,'send');save();render();toast('Draft tersimpan. Belum ada pesan yang dikirim.');return;
   }
   return oldAction(act,el);
 };
 document.addEventListener('change',e=>{
   const el=e.target;
   if(el?.dataset?.v16Lead){
     const v=el.dataset.v16Lead;
     ui.v16LeadIds=el.checked?[...new Set([...ui.v16LeadIds,v])]:ui.v16LeadIds.filter(x=>x!==v);
     render();
   }else if(el?.id==='v16SelectAll'){
     ui.v16LeadIds=el.checked?state.leads.map(l=>l.id):[];
     render();
   }
 });
 // Make fresh workspace visibly actionable without inserting example contacts.
 render();
})();

