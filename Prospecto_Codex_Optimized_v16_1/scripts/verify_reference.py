#!/usr/bin/env python3
"""Cheap static validation of the approved optimized UI reference. No third-party packages."""
from pathlib import Path
import json,hashlib,re,subprocess,sys
root=Path(__file__).resolve().parents[1]
ui=root/'reference-ui';html=(ui/'index.html').read_text(encoding='utf8')
errors=[]
styles=re.findall(r'<link\s+rel="stylesheet"\s+href="([^"]+)"',html)
scripts=re.findall(r'<script\s+src="([^"]+)"></script>',html)
for rel in styles+scripts:
 if not (ui/rel).is_file():errors.append('Missing source: '+rel)
if re.search(r'data:image/[^;]+;base64,',html):errors.append('Embedded Base64 still present in HTML')
for js in [ui/rel for rel in scripts]:
 data=js.read_text(encoding='utf8')
 for f in re.findall(r'assets/([a-zA-Z0-9_.-]+\.(?:png|webp|jpg|jpeg|svg))',data):
  if not (ui/'assets'/f).is_file():errors.append(f'Missing referenced asset {f} in {js.name}')
 try:subprocess.run(['node','--check',str(js)],check=True,capture_output=True,text=True)
 except FileNotFoundError:print('NOTE: Node.js not installed; JS syntax check skipped')
 except subprocess.CalledProcessError as e:errors.append('JS syntax error '+str(js)+': '+e.stderr[:400])
manifest=json.loads((ui/'assets'/'manifest.json').read_text())
for entry in manifest['assets']:
 f=ui/'assets'/entry['name']
 if not f.exists():errors.append('Missing asset '+entry['name']);continue
 h=hashlib.sha256(f.read_bytes()).hexdigest()
 if h!=entry['sha256']:errors.append('Asset checksum mismatch '+entry['name'])
print(f"HTML {len(html):,} chars; {len(styles)} CSS files; {len(scripts)} JS files; {len(manifest['assets'])} unique assets from {manifest['extracted_data_uris']} embedded occurrences")
print('PASS' if not errors else 'FAIL')
for e in errors:print('ERROR:',e)
sys.exit(1 if errors else 0)
