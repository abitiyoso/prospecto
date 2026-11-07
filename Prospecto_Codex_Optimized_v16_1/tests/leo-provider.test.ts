import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiConfig,AIProviderError,parseDraft,providerFailure} from '../lib/leo-contract';
const env={OPENAI_API_KEY:'openai-test-only',OPENAI_MODEL:'direct-model',NINE_ROUTER_API_KEY:'router-test-only',NINE_ROUTER_MODEL:'cx/router-model'};
const draft={subject:'Halo {{company}}',body:'Halo {{first_name}}, produk ini membantu tim. Salam {{sender_name}}',rationale:'Berdasarkan profil.',source_ids:['product']};
const chat=(v:unknown=draft)=>({model:'actual-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify(v)}}]});
const code=(expected:string)=>(e:unknown)=>e instanceof AIProviderError&&e.code===expected;
test('AI routes use only the selected provider credential/model and reject partial configuration',()=>{
 assert.equal(aiConfig(env).apiKey,'openai-test-only');
 const c=aiConfig({...env,AI_PROVIDER:'9router'});assert.equal(c.apiKey,'router-test-only');assert.equal(c.model,'cx/router-model');assert.equal(c.baseURL,'http://127.0.0.1:20128/v1');
 for(const overrides of [{AI_PROVIDER:'other'},{AI_PROVIDER:'9router',NINE_ROUTER_API_KEY:''},{AI_PROVIDER:'9router',NINE_ROUTER_MODEL:''},{OPENAI_MODEL:''}])assert.throws(()=>aiConfig({...env,...overrides}),code('ai_not_configured'));
 assert.equal(aiConfig({...env,AI_PROVIDER:'9router',NINE_ROUTER_BASE_URL:'https://router.example/v1/'}).baseURL,'https://router.example/v1');
 for(const base of ['http://router.example/v1','https://key@router.example/v1','https://router.example/v1?key=secret','file:///tmp/a'])assert.throws(()=>aiConfig({...env,AI_PROVIDER:'9router',NINE_ROUTER_BASE_URL:base}),code('ai_not_configured'));
 assert.throws(()=>aiConfig({...env,AI_REASONING_EFFORT:'invalid'}),code('ai_not_configured'));
});
test('provider errors remain actionable without exposing raw upstream diagnostics or credentials',()=>{
 const cases:[number,unknown,string,number][]=[[429,{error:{code:'credit_balance_exhausted',message:'private upstream diagnostic'}},'ai_quota_exhausted',503],[401,{error:{message:'private upstream diagnostic'}},'ai_credentials_rejected',503],[429,{},'ai_rate_limited',429],[404,{},'ai_model_unavailable',503],[500,{error:{code:{secret:'private upstream diagnostic'}}},'ai_provider_unavailable',502]];
 for(const [status,body,expected,publicStatus] of cases){const e=providerFailure(status,body);assert.equal(e.code,expected);assert.equal(e.status,publicStatus);assert.ok(!e.message.includes('private upstream diagnostic'));}
});
test('both provider protocols preserve the actual model and validated source-linked draft',()=>{
 assert.deepEqual(parseDraft('9router',chat(),['product']),{draft,model:'actual-model'});
 const audienceDraft={...draft,source_ids:['product','campaign-audience']};
 const fenced=(value:unknown)=>({choices:[{finish_reason:'stop',message:{content:'```json\n'+JSON.stringify(value)+'\n```'}}]});
 assert.deepEqual(parseDraft('9router',fenced(audienceDraft),['product','campaign-audience']).draft,audienceDraft);
 assert.throws(()=>parseDraft('9router',fenced(audienceDraft),['product']),code('ai_invalid_draft'));
 assert.deepEqual(parseDraft('openai',{status:'completed',model:'direct-actual',output:[{content:[{type:'output_text',text:JSON.stringify(draft)}]}]},['product']),{draft,model:'direct-actual'});
});
test('refusals and incomplete output never become saved AI drafts',()=>{
 assert.throws(()=>parseDraft('9router',{choices:[{finish_reason:'length',message:{content:JSON.stringify(draft)}}]},['product']),code('ai_incomplete'));
 assert.throws(()=>parseDraft('9router',{choices:[{message:{refusal:'No'}}]},['product']),code('ai_refused'));
 assert.throws(()=>parseDraft('openai',{status:'incomplete'},['product']),code('ai_incomplete'));
 assert.throws(()=>parseDraft('openai',{status:'completed',output:[{content:[{type:'refusal'}]}]},['product']),code('ai_refused'));
});
test('malformed JSON, unsupported claims of citations, header injection and unsupported variables are rejected',()=>{
 for(const v of [{...draft,source_ids:['foreign-source']},{...draft,source_ids:[]},{...draft,subject:'Subject\r\nBcc: bad@example.com'},{...draft,body:'Hello {{invented_variable}}'},{...draft,subject:''},{...draft,unexpected:'value'}])assert.throws(()=>parseDraft('9router',chat(v),['product']),code('ai_invalid_draft'));
 assert.throws(()=>parseDraft('9router',{choices:[{finish_reason:'stop',message:{content:'not JSON'}}]},['product']),code('ai_invalid_draft'));
 assert.throws(()=>parseDraft('openai',{status:'completed',output:{}},['product']),code('ai_invalid_draft'));
});
