import 'server-only';
import nodemailer from 'nodemailer';
import {lookup} from 'node:dns/promises';
import {z} from 'zod';
import {unseal} from './server-crypto';
export const smtpInput=z.object({host:z.string().trim().min(3).max(253).regex(/^[a-zA-Z0-9.-]+$/),port:z.union([z.literal(465),z.literal(587)]),user:z.string().email().max(254),password:z.string().min(1).max(500),from:z.string().email().max(254),name:z.string().trim().min(1).max(100)}).refine(v=>v.user.toLowerCase()===v.from.toLowerCase(),'Alamat pengirim harus sama dengan akun SMTP');
export type SmtpConfig=z.infer<typeof smtpInput>;
export function privateAddress(ip:string){return ip.includes(':')||/^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|2(2[4-9]|[3-5]\d)\.)/.test(ip);}
export async function smtpTransport(config:SmtpConfig){const ips=await lookup(config.host,{all:true,family:4});if(!ips.length||ips.some(i=>privateAddress(i.address)))throw new Error('Host SMTP harus publik');return nodemailer.createTransport({host:ips[0].address,port:config.port,secure:config.port===465,requireTLS:true,tls:{servername:config.host,minVersion:'TLSv1.2'},auth:{user:config.user,pass:config.password},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});}
export async function connectionTransport(db:ReturnType<typeof import('./admin').adminDb>,id:string){const {data}=await db.from('smtp_credentials').select('ciphertext').eq('connection_id',id).single();if(!data)throw new Error('Kredensial sender tidak tersedia');const config=unseal<SmtpConfig>(data.ciphertext);return {config,transport:await smtpTransport(config)};}
export function platformSmtp():SmtpConfig{return smtpInput.parse({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),user:process.env.SMTP_USER,password:process.env.SMTP_PASS,from:process.env.SMTP_FROM,name:process.env.SMTP_FROM_NAME||'Prospecto by Elenio'});}
export function allowedRecipient(email:string){const base=process.env.APP_BASE_URL||'';if(base.startsWith('https://'))return true;return (process.env.SMTP_PRESENTATION_RECIPIENTS||'').split(',').map(s=>s.trim().toLowerCase()).includes(email.toLowerCase());}
