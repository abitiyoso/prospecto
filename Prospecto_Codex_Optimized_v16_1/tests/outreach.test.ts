import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalJSON,contentIssues,defaultSteps,outreachInput,personalize,stepsInput} from '../lib/outreach';
import type {Contact} from '../lib/domain';
const c={id:crypto.randomUUID(),name:'Budi Santoso',email:'budi@example.com',verification:'verified',source_url:'https://example.com/team',company_name:'Example',companies:null} as Contact;
test('JSONB key ordering after save does not mark an unchanged draft as dirty',()=>{
 assert.equal(canonicalJSON({steps:[{kind:'condition',then_step:null,else_step:null}]}),canonicalJSON({steps:[{else_step:null,then_step:null,kind:'condition'}]}));
 assert.notEqual(canonicalJSON({steps:defaultSteps}),canonicalJSON({steps:[...defaultSteps].reverse()}));
});
test('personalization preserves unknown or missing variables and never invents facts',()=>{
 assert.deepEqual(personalize('Halo {{ first_name }}, {{company}} / {{sender_name}}',c,'Ani'),{text:'Halo Budi, Example / Ani',unresolved:[]});
 assert.ok(personalize('{{private_phone}} / {{company}}',{...c,company_name:''},'').unresolved.includes('private_phone'));
 assert.ok(personalize('{{bad',c,'Ani').unresolved.length);
});
test('content review checks every recipient and every sequence step',()=>{
 assert.deepEqual(contentIssues(defaultSteps,[c],'Ani',crypto.randomUUID()),[]);
 assert.ok(contentIssues(defaultSteps,[c,{...c,verification:'unverified'}],'Ani','product').some(x=>x.includes('Verifikasi')));
 assert.ok(contentIssues(defaultSteps,[{...c,company_name:''}],'Ani','product').some(x=>x.includes('variabel')));
 assert.ok(contentIssues([{kind:'wait',days:3,subject:'',body:''}],[c],'Ani','product').some(x=>x.includes('email')));
});
test('sequence validation rejects excessive steps, automatic LinkedIn, invalid delays and oversized messages',()=>{
 for(const steps of [[],Array(13).fill(defaultSteps[0]),[{...defaultSteps[0],kind:'linkedin_auto'}],[{...defaultSteps[1],days:0}],[{...defaultSteps[0],body:'a'.repeat(20001)}]])assert.equal(stepsInput.safeParse(steps).success,false);
 assert.equal(outreachInput.safeParse({name:'Campaign',product_id:'foreign',sender_name:'A',steps:defaultSteps}).success,false);
});
test('conditional branches point forward or stop, never form cycles',()=>{
 const branch={kind:'condition',subject:'',body:'',days:3,condition:'not_replied',then_step:2,else_step:null};
 assert.equal(stepsInput.safeParse([branch,defaultSteps[0]]).success,true);
 assert.equal(stepsInput.safeParse([{...branch,then_step:1},defaultSteps[0]]).success,false);
 assert.equal(stepsInput.safeParse([{...branch,then_step:3},defaultSteps[0]]).success,false);
});
