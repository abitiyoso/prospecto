import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const source=path.resolve('../PROSPECTO_CODEX_LEAN_HANDOFF_V8/source');
const output=process.env.QA_OUTPUT_DIR||'qa/phase0';await mkdir(output,{recursive:true});
const origin=process.env.QA_BASE_URL||'http://127.0.0.1:3000',baseline='http://127.0.0.1:3192';
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const server=createServer(async(req,res)=>{try{const target=path.resolve(source,'.'+(req.url==='/'?'/index.html':new URL(req.url!,baseline).pathname));if(!target.startsWith(source+path.sep))throw Error();const bytes=await readFile(target);const ext=path.extname(target);res.setHeader('Content-Type',({'.html':'text/html','.png':'image/png','.webp':'image/webp'}as Record<string,string>)[ext]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404).end();}});
await new Promise<void>(r=>server.listen(3192,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks:Record<string,unknown>={};const captures:unknown[]=[];const errors:string[]=[];
try{
 const landing=await readFile(path.join(source,'index.html'));const workspace=await readFile(path.join(source,'workspace.html'));
 expect(hash(Buffer.from(await(await fetch(origin)).arrayBuffer()))).toBe(hash(Buffer.from(landing.toString().replace('<a href="#workspace-asli">Masuk</a>','<a href="/app">Masuk</a>').replace('<a href="#produk" class="button">Mulai Sekarang','<a href="/app?mode=signup" class="button">Mulai Sekarang').replace('<a href="#workspace-asli" class="button">Mulai Sekarang','<a href="/app?mode=signup" class="button">Mulai Sekarang').trimEnd()+'\n')));expect(hash(Buffer.from(await(await fetch(origin+'/workspace.html')).arrayBuffer()))).toBe(hash(workspace));checks.approvedMarkupExceptThreeAuthLinks=true;
 const lock=await readFile('../PROSPECTO_CODEX_LEAN_HANDOFF_V8/ASSET_LOCK.txt','utf8');let assets=0;
 for(const line of lock.split(/\r?\n/)){const m=line.match(/^([a-f0-9]{64})\s+source\/(.+)$/);if(!m)continue;expect(hash(await readFile(path.join(source,m[2])))).toBe(m[1]);if(m[2].startsWith('assets/')){expect(hash(await readFile('public/'+m[2]))).toBe(m[1]);assets++;}}
 expect(hash(await readFile('public/assets/prospecto-logo-approved.png'))).toBe('5381ecac311a25b2cd6f2d1341aa822dd787a32c93bc285c5ed5c809f34616e2');checks.assetHashes=assets;checks.latestLogo=true;
 const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const [width,height]of [[1440,900],[1024,768],[390,844],[320,700]]){
  await page.setViewportSize({width,height});const pair:Record<string,string>={};
  for(const [label,url]of [['source',baseline],['served',origin]]){
   await page.goto(url);await page.evaluate(()=>document.fonts.ready);await page.locator('.hero img').first().waitFor({state:'attached'});await page.waitForFunction(()=>Array.from(document.images).filter(i=>i.closest('.header,.hero')).every(i=>i.complete&&i.naturalWidth>0));
   await page.waitForTimeout(300);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow,`${label} overflow at ${width}`).toBe(false);
   const nav=await page.locator('.nav-center').boundingBox();if(width>=1024&&nav){expect(Math.abs(nav.x+nav.width/2-width/2)).toBeLessThanOrEqual(1);}
   const first=await page.screenshot({path:`${output}/${label}-${width}-firstfold.png`,animations:'disabled'});pair[label]=hash(first);
   await page.screenshot({path:`${output}/${label}-${width}-full.png`,fullPage:true,animations:'disabled'});
  }
  expect(pair.served).toBe(pair.source);
  captures.push({width,height,sourceHash:pair.source,servedHash:pair.served,pixelExact:pair.source===pair.served});
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(origin);
 for(const tab of ['knowledge','prospect','pic','campaign','analytics']){await page.locator(`[data-tab="${tab}"]`).click();await expect(page.locator(`#stage-${tab}`)).toBeVisible();}
 checks.fiveTabs=true;
 await page.locator('[data-tab="prospect"]').click();await page.locator('#prospectSearch').fill('zz-no-match');await expect(page.locator('#prospectRows tr:visible')).toHaveCount(0);await page.locator('#prospectSearch').fill('');checks.prospectSearch=true;
 await page.locator('[data-tab="campaign"]').click();await page.locator('#stepMessage').fill('QA edited message');await page.locator('#saveSequence').click();checks.sequenceEditing=true;
 await page.locator('#csvInput').setInputFiles({name:'phase0.csv',mimeType:'text/csv',buffer:Buffer.from('name,email\nQA,qa@example.test')});await expect(page.locator('#uploadSummary')).toBeVisible();checks.csvInteraction=true;
 await page.locator('#leoFab').click();await expect(page.locator('#leoPop')).toBeVisible();await page.keyboard.press('Escape');checks.leoPanel=true;
 await page.locator('[data-open-workspace]').first().click();await expect(page.locator('#workspaceModal')).toHaveClass(/open/);await expect(page.frameLocator('#modalWorkspace').locator('#app')).not.toBeEmpty();await page.keyboard.press('Escape');await expect(page.locator('#workspaceModal')).not.toHaveClass(/open/);checks.workspaceV15Overlay=true;
 await page.setViewportSize({width:390,height:844});await page.goto(origin);await page.locator('#menuButton').click();await expect(page.locator('#mobileNav')).toHaveClass(/open/);await page.locator('#mobileNav a').first().click();await expect(page.locator('#mobileNav')).not.toHaveClass(/open/);checks.mobileMenu=true;
 await page.goto(origin+'/app');await expect(page.getByRole('heading',{name:'Masuk ke workspace'})).toBeVisible();checks.existingAppLogin=true;
 expect(errors).toEqual([]);checks.noClientExceptions=true;
 await writeFile(`${output}/results.json`,JSON.stringify({checks,captures,errors,note:'Supplied previews may show the superseded logo. Latest ASSET_LOCK guideline logo wins. Source/served captures use identical viewport and reduced-motion settings.'},null,2));
 console.log(JSON.stringify({passed:true,checks,captures},null,2));
}catch(e){await writeFile(`${output}/failure.txt`,String(e));throw e;}finally{await browser.close();server.close();}



