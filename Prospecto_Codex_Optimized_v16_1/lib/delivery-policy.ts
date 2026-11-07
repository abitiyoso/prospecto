export function applicationOrigin(value?:string){
 try{const url=new URL(value||'');return ['http:','https:'].includes(url.protocol)&&url.origin===value?url:null;}catch{return null;}
}

export function isLoopback(hostname:string){return ['localhost','127.0.0.1','[::1]'].includes(hostname);}

export function recipientAllowed(email:string,env:Record<string,string|undefined>){
 const origin=applicationOrigin(env.APP_BASE_URL);
 if(env.SMTP_DELIVERY_MODE==='live'&&origin?.protocol==='https:'&&!isLoopback(origin.hostname))return true;
 return (env.SMTP_PRESENTATION_RECIPIENTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase());
}
