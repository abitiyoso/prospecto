import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readBody,RequestTooLarge,requestOrigin,sameOrigin} from '../lib/request';
test('CSRF accepts actual request host when framework normalizes URL hostname',()=>{
 const req=(origin:string,host='127.0.0.1:3189')=>new Request('http://localhost:3189/auth/action',{headers:{host,origin}});
 assert.equal(sameOrigin(req('http://127.0.0.1:3189')),true);
 for(const origin of ['https://foreign.example','null','http://127.0.0.1:3190','http://127.0.0.1:3189/path'])assert.equal(sameOrigin(req(origin)),false);
});
test('TLS-terminating proxy uses the configured public origin for CSRF and redirects',()=>{
 const original=process.env.APP_BASE_URL;
 process.env.APP_BASE_URL='https://app.example';
 try {
  const req=(origin:string)=>new Request('http://localhost:3000/auth/action',{method:'POST',headers:{host:'app.example',origin,'x-forwarded-proto':'http','x-forwarded-host':'foreign.example'}});
  assert.equal(requestOrigin(req('https://app.example')),'https://app.example');
  assert.equal(sameOrigin(req('https://app.example')),true);
  for(const origin of ['http://app.example','http://localhost:3000','https://foreign.example'])assert.equal(sameOrigin(req(origin)),false);
 } finally {
  if(original===undefined)delete process.env.APP_BASE_URL;
  else process.env.APP_BASE_URL=original;
 }
});
test('request body limits protect declared and chunked payloads',async()=>{
 const req=(body:string,headers:Record<string,string>={})=>new Request('http://localhost',{method:'POST',body,headers});
 assert.equal(new TextDecoder().decode(await readBody(req('valid'),5)),'valid');
 await assert.rejects(readBody(req('small',{'content-length':'99999'}),10),RequestTooLarge);
 await assert.rejects(readBody(req('a'.repeat(11)),10),RequestTooLarge);
 assert.equal((await readBody(new Request('http://localhost'),10)).length,0);
});
test('no-referrer native POST forms require exact same-origin browser Fetch Metadata',()=>{
 const headers={origin:'null','sec-fetch-site':'same-origin','sec-fetch-mode':'navigate','sec-fetch-dest':'document'};
 const req=(extra:Record<string,string>={},method='POST')=>new Request('https://app.example/auth/verify',{method,headers:{...headers,...extra}});
 assert.equal(sameOrigin(req()),true);
 const rejected:Record<string,string>[]=[{'sec-fetch-site':'cross-site'},{'sec-fetch-site':'same-site'},{'sec-fetch-site':'none'},{'sec-fetch-mode':'cors'},{'sec-fetch-dest':'empty'},{'sec-fetch-site':''},{origin:'https://foreign.example'},{origin:''}];
 for(const extra of rejected)assert.equal(sameOrigin(req(extra)),false);
 assert.equal(sameOrigin(req({},'GET')),false);
 assert.equal(sameOrigin(new Request('https://app.example/auth/verify',{method:'POST',headers:{origin:'null'}})),false);
});
