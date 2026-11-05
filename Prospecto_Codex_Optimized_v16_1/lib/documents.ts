import {fromBuffer,type Entry} from 'yauzl';
import {readSheet} from 'read-excel-file/node';
import {zipSync,strToU8} from 'fflate';
export async function readOfficeArchive(bytes:Uint8Array,required?:string,maxBytes=40*1024*1024){
 if(bytes.length>10*1024*1024||bytes[0]!==80||bytes[1]!==75)throw new Error('Arsip Office tidak valid atau terlalu besar');
 return new Promise<Record<string,Uint8Array>>((resolve,reject)=>{fromBuffer(Buffer.from(bytes),{lazyEntries:true,validateEntrySizes:true},(err,zip)=>{
  if(err||!zip)return reject(new Error('Arsip tidak valid'));let total=0,count=0;const files:Record<string,Uint8Array>={};let done=false;
  const fail=()=>{if(done)return;done=true;zip.close();reject(new Error('Arsip melebihi batas atau tidak aman'));};
  zip.on('error',fail);zip.on('entry',(entry:Entry)=>{
   if(++count>1000||entry.fileName in files||entry.fileName.includes('..')||entry.fileName.startsWith('/')||entry.generalPurposeBitFlag&1||entry.uncompressedSize>maxBytes)return fail();
   if(entry.fileName.endsWith('/'))return zip.readEntry();
   zip.openReadStream(entry,(e,stream)=>{if(e||!stream)return fail();const chunks:Buffer[]=[];stream.on('error',fail);stream.on('data',(b:Buffer)=>{total+=b.length;if(total>maxBytes){stream.destroy();fail();}else chunks.push(b);});stream.on('end',()=>{if(done)return;files[entry.fileName]=Buffer.concat(chunks);zip.readEntry();});});
  });zip.on('end',()=>{if(done)return;done=true;if(required&&!files[required])reject(new Error('Isi dokumen Office tidak sesuai ekstensi'));else resolve(files);});zip.readEntry();
 });});
}
export async function spreadsheetCsv(bytes:Uint8Array){
 const files=await readOfficeArchive(bytes,'xl/workbook.xml',20*1024*1024);
 if(Object.keys(files).some(k=>/vbaProject|externalLinks/i.test(k)))throw new Error('Macro atau tautan eksternal tidak didukung');
 const rows=await readSheet(Buffer.from(zipSync(files)),1,{trim:true});
 if(!rows.length||rows.length>1001||rows.some(r=>r.length>50))throw new Error('XLSX maksimal 1.000 baris dan 50 kolom pada sheet pertama');
 return rows.map(r=>r.map(v=>'"'+(v==null?'':v instanceof Date?v.toISOString():String(v)).replaceAll('"','""')+'"').join(',')).join('\r\n');
}
export function chunkText(text:string){const clean=text.replace(/\u0000/g,'').replace(/\r\n/g,'\n').trim();if(!clean)throw new Error('Dokumen tidak memiliki teks. PDF pindai memerlukan OCR.');if(clean.length>200000)throw new Error('Teks dokumen maksimal 200.000 karakter');const chunks:string[]=[];for(let i=0;i<clean.length;i+=2000)chunks.push(clean.slice(i,i+2400));return {text:clean,chunks};}
export async function extractDocument(name:string,bytes:Uint8Array){
 const ext=name.split('.').pop()?.toLowerCase();let text='';
 if(ext==='txt')text=new TextDecoder('utf8',{fatal:true}).decode(bytes);
 else if(ext==='docx'){const files=await readOfficeArchive(bytes,'word/document.xml');if(Object.keys(files).some(k=>/vbaProject/i.test(k)))throw new Error('Macro tidak didukung');const mammoth=await import('mammoth');text=(await mammoth.extractRawText({buffer:Buffer.from(zipSync(files))})).value;}
 else if(ext==='pdf'){const {PDFParse}=await import('pdf-parse');const pdf=new PDFParse({data:Uint8Array.from(bytes),isEvalSupported:false,useSystemFonts:false});try{const info=await pdf.getInfo();if(info.total>100)throw new Error('PDF maksimal 100 halaman');text=(await pdf.getText({first:100})).text;}finally{await pdf.destroy();}}
 else throw new Error('Format dokumen belum didukung');return chunkText(text);
}
export const officeFixture=(files:Record<string,string>)=>zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8(v)])));
