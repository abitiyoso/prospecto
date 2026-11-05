import {z} from 'zod';
import {uuid} from './domain';
export const leadListInput=z.object({id:uuid.nullable().default(null),name:z.string().trim().min(1).max(160),contact_ids:z.array(uuid).max(5000)}).refine(v=>new Set(v.contact_ids).size===v.contact_ids.length,'Kontak daftar duplikat');
export type LeadList={id:string;name:string;created_at:string};
export type LeadListMember={list_id:string;contact_id:string};
