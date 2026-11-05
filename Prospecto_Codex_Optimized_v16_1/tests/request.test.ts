import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readBody,RequestTooLarge,sameOrigin} from '../lib/request';
test('CSRF accepts actual request host when framework normalizes URL hostname',()=>{
 const req=(origin:string,host='127.0.0.1:3189')=>new Request('http://localhost:3189/auth/action',{headers:{host,origin}});
 assert.equal(sameOrigin(req('http://127.0.0.1:3189')),true);
 for(const origin of ['https://foreign.example','null','http://127.0.0.1:3190','http://127.0.0.1:3189/path'])assert.equal(sameOrigin(req(origin)),false);
});
test('request body limits protect declared and chunked payloads',async()=>{
 const req=(body:string,headers:Record<string,string>={})=>new Request('http://localhost',{method:'POST',body,headers});
 assert.equal(new TextDecoder().decode(await readBody(req('valid'),5)),'valid');
 await assert.rejects(readBody(req('small',{'content-length':'99999'}),10),RequestTooLarge);
 await assert.rejects(readBody(req('a'.repeat(11)),10),RequestTooLarge);
 assert.equal((await readBody(new Request('http://localhost'),10)).length,0);
});
