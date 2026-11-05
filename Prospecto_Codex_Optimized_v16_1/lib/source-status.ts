import type {Source} from './domain';
import type {IndexedSource} from './workflow-types';
export function sourceStatus(source:Source,index?:IndexedSource){
 if(source.upload_state==='failed')return 'Upload gagal';
 if(source.upload_state==='uploading')return 'Upload belum selesai';
 if(index?.state==='ready')return 'Siap dicari';
 if(index?.state==='indexing')return 'Sedang diproses';
 if(index?.state==='failed')return 'Pengindeksan gagal';
 return 'Menunggu pengindeksan';
}
