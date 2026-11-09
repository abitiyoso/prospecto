import {applicationOrigin,isLoopback} from './delivery-policy';

export class RequestTooLarge extends Error { constructor(){super('Permintaan terlalu besar');} }
export function requestOrigin(request:Request):string {
 // TLS ends at the reverse proxy. Use the configured public origin for
 // production redirects and CSRF checks instead of incoming proxy headers.
 const publicOrigin=applicationOrigin(process.env.APP_BASE_URL);
 if(publicOrigin?.protocol==='https:'&&!isLoopback(publicOrigin.hostname))return publicOrigin.origin;
 const url=new URL(request.url);
 const host=request.headers.get('host');
 if(host)url.host=host;
 return url.origin;
}
export function sameOrigin(request:Request):boolean {
 const origin=request.headers.get('origin');if(!origin)return false;
 // no-referrer turns native POST navigation Origin into "null". Browser-set
 // Fetch Metadata still proves this form came from the exact same origin.
 // Never accept cross-site/same-site, fetch calls, missing metadata or GETs.
 if(origin==='null')return request.method==='POST'&&request.headers.get('sec-fetch-site')==='same-origin'&&request.headers.get('sec-fetch-mode')==='navigate'&&request.headers.get('sec-fetch-dest')==='document';
 try{return new URL(origin).origin===origin && origin===requestOrigin(request);}catch{return false;}
}
/** Bound streamed bodies too: Content-Length is optional and cannot be trusted. */
export async function readBody(request: Request, limit: number): Promise<Uint8Array> {
 if(Number(request.headers.get('content-length')||0)>limit)throw new RequestTooLarge();
 if(!request.body)return new Uint8Array();
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new RequestTooLarge();}chunks.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
