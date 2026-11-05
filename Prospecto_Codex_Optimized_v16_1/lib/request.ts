export class RequestTooLarge extends Error { constructor(){super('Permintaan terlalu besar');} }
export function requestOrigin(request:Request):string {
 const url=new URL(request.url);
 const host=request.headers.get('host');
 if(host)url.host=host;
 return url.origin;
}
export function sameOrigin(request:Request):boolean {
 const origin=request.headers.get('origin');if(!origin)return false;
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
