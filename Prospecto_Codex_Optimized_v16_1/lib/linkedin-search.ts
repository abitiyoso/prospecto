import {normalizeEvidence} from './research';

const words = (value: string) => value.normalize('NFKD').toLowerCase()
  .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function linkedinSearchQuery(name: string, company: string) {
  const clean = (value: string) => value.replace(/["\\\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  const employer = clean(company).replace(/^(?:PT\.?|CV\.?)\s+/i, '').replace(/\s+Tbk\.?$/i, '');
  return `site:linkedin.com/in "${clean(name)}" "${employer}"`;
}

export function matchedLinkedinProfiles(rows: unknown, name: string, company: string) {
  const person = words(name);
  const employer = words(company).replace(/^(pt|cv) /, '').replace(/ tbk$/, '');
  const contains = (haystack: string, phrase: string) => ` ${haystack} `.includes(` ${phrase} `);
  if (person.length < 2 || employer.length < 2) return [];

  const matches = new Set<string>();
  for (const row of normalizeEvidence(rows)) {
    const url = new URL(row.url);
    if (!/^(?:(?:www|[a-z]{2})\.)?linkedin\.com$/.test(url.hostname) || url.port) continue;
    let path: string;
    try { path = decodeURIComponent(url.pathname); } catch { continue; }
    if (!/^\/in\/[\p{L}\p{N}_-]+\/?$/u.test(path)) continue;
    const titleName = row.title.split(/\s[-–—|·]\s|\s*\|\s*/u, 1)[0];
    const indexedName = words(titleName);
    const extendedName = person.split(' ').length >= 3 && indexedName.startsWith(`${person} `);
    if (indexedName !== person && !extendedName) continue;
    if (!contains(words(`${row.title} ${row.description}`), employer)) continue;
    matches.add(`https://www.linkedin.com${url.pathname.replace(/\/$/, '')}`);
  }
  return [...matches].slice(0, 3);
}
