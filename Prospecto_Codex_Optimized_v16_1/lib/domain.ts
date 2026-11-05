import { z } from 'zod';
export const uuid = z.string().uuid();
const text = (max = 4000) => z.string().trim().max(max).default('');
export const productInput = z.object({ name: z.string().trim().min(1).max(160), category: text(120), pain_points: text(), industry: text(500), buyer_roles: text(500), value_proposition: text(), pricing_context: text() });
export const contactInput = z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().toLowerCase().email().max(254), company: text(160), domain: text(253).refine(v => !v || /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(v), 'Domain perusahaan tidak valid'), title: text(160), source_url: text(2000).refine(v => !v || safeUrl(v), 'URL sumber harus HTTPS'), verification: z.enum(['unverified','verified']).default('unverified') }).refine(v => v.verification !== 'verified' || !!v.source_url, 'Kontak terverifikasi membutuhkan URL bukti');
export function safeUrl(value: string) { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }
export const sourceInput = z.object({ product_id: uuid, title: z.string().trim().min(1).max(200), kind: z.enum(['note','url']), content: z.string().trim().min(1).max(50000) }).refine(v => v.kind !== 'url' || safeUrl(v.content), 'URL harus HTTPS');
export const campaignInput = z.object({ name: z.string().trim().min(1).max(160), contact_ids: z.array(uuid).min(1).max(1000) }).refine(v => new Set(v.contact_ids).size === v.contact_ids.length, 'Audience berisi duplikat');
export type Product = z.infer<typeof productInput> & { id: string; workspace_id: string };
export type Contact = Omit<z.infer<typeof contactInput>, 'company'|'domain'> & { id: string; workspace_id: string; company_id: string | null; company_name?: string; companies?: { name: string; domain: string } | null };
export type Source = { id: string; product_id: string; title: string; kind: string; content: string; status: string; upload_state: 'uploading'|'stored'|'failed'; storage_path: string | null };
export type Campaign = { id: string; name: string; subject: string; body: string; status: 'draft'; product_id:string|null; sender_name:string; steps:import('./outreach').CampaignStep[]; preflight?:{content_ready:boolean;approved:boolean;sending_available:false}; campaign_audience: { contact_id: string }[] };
export type Workspace = { id: string; name: string; role: 'owner'|'admin'|'member' };
export type DashboardData = { templates?:import('./outreach').CampaignTemplate[]; prospects?: {researchAvailable?:boolean; runs?: import('./research').ResearchRun[]; icps: import('./prospect').ICP[]; companies: import('./prospect').Company[]; pics: import('./prospect').PIC[]}; workspaces: Workspace[]; active: Workspace; products: Product[]; sources: Source[]; contacts: Contact[]; campaigns: Campaign[]; email: string };

// RFC 4180 style quoted fields, escaped quotes, CRLF and embedded line breaks.
export function parseCsv(raw: string): string[][] {
  if (new TextEncoder().encode(raw).length > 2_000_000) throw new Error('CSV maksimal 2 MB');
  const input = raw.replace(/^\uFEFF/, '');
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) { if (c === '"' && input[i+1] === '"') { cell += '"'; i++; } else if (c === '"') { quoted = false; closed = true; } else cell += c; }
    else if (c === '"') { if (cell || closed) throw new Error('Tanda kutip CSV tidak valid'); quoted = true; }
    else if (c === ',' || c === '\n' || c === '\r') {
      row.push(cell); cell = ''; closed = false;
      if (c !== ',') { if (row.some(v => v.trim())) rows.push(row); row = []; if(c === '\r' && input[i+1] === '\n') i++; }
    } else { if (closed && c.trim()) throw new Error('Karakter setelah penutup kutip'); if (!closed) cell += c; }
  }
  if (quoted) throw new Error('Kutip CSV belum ditutup');
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('CSV harus memiliki header dan minimal satu baris');
  if (rows.length > 1001) throw new Error('Maksimal 1.000 baris per impor');
  if (new Set(rows[0].map(x => x.trim())).size !== rows[0].length) throw new Error('Header CSV harus unik');
  if (rows.some(r => r.length !== rows[0].length)) throw new Error('Jumlah kolom CSV tidak konsisten');
  return rows;
}
export function mapCsv(raw: string, mapping: Record<string, string>) {
  const [headers, ...rows] = parseCsv(raw);
  if (!mapping.name || !mapping.email || !headers.includes(mapping.name) || !headers.includes(mapping.email)) throw new Error('Petakan kolom nama dan email');
  const valid: z.infer<typeof contactInput>[] = []; const errors: { row: number; message: string }[] = []; const seen = new Set<string>(); let duplicates = 0;
  rows.forEach((row, i) => {
    const value = Object.fromEntries(Object.entries(mapping).map(([key, header]) => [key, row[headers.indexOf(header)] ?? '']));
    const parsed = contactInput.safeParse({ ...value, verification: 'unverified' });
    if (!parsed.success) errors.push({ row: i+2, message: parsed.error.issues.map(x=>x.message).join('; ') });
    else if (seen.has(parsed.data.email)) duplicates++;
    else { seen.add(parsed.data.email); valid.push(parsed.data); }
  });
  return { valid, errors, duplicates, total: rows.length };
}
export function csvExport(rows: string[][]) { return rows.map(row => row.map(v => '"' + (/^[\s]*[=+\-@\t\r]/.test(v) ? "'"+v : v).replaceAll('"','""') + '"').join(',')).join('\r\n'); }
export function assertUpload(name: string, type: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Ukuran berkas harus 1 byte–10 MB');
  const ext = name.split('.').pop()?.toLowerCase();
  const head = new TextDecoder().decode(bytes.subarray(0, 8));
  if (ext === 'pdf' && type === 'application/pdf' && head.startsWith('%PDF-')) return;
  // DOCX is deliberately blocked until an OOXML parser can verify package contents.
  if (ext === 'txt' && (type === 'text/plain' || !type) && !bytes.includes(0)) { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return; }
  throw new Error('Gunakan PDF atau TXT UTF-8 yang valid. DOCX belum tersedia.');
}


