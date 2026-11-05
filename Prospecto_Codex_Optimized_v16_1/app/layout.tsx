import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Prospecto by Elenio', description: 'Workspace produk, prospek, dan campaign B2B.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="id"><head><link rel="stylesheet" href="/reference-styles/base.css"/><link rel="stylesheet" href="/reference-styles/module-overrides.css"/><link rel="stylesheet" href="/reference-styles/v16-journey.css"/></head><body>{children}</body></html>; }
