import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recipientAllowed} from '../lib/delivery-policy';

test('public HTTPS still restricts delivery until live is explicitly set',()=>{
 const env={APP_BASE_URL:'https://prospecto.example',SMTP_PRESENTATION_RECIPIENTS:' QA@EXAMPLE.COM , second@example.com'};
 assert.equal(recipientAllowed('qa@example.com',env),true);
 assert.equal(recipientAllowed('actual@example.com',env),false);
 assert.equal(recipientAllowed('actual@example.com',{...env,SMTP_DELIVERY_MODE:'live'}),true);
 for(const APP_BASE_URL of ['http://prospecto.example','https://localhost','https://127.0.0.1','https://[::1]','https://prospecto.example/path','https://prospecto.example/','https://user:password@prospecto.example']){
  assert.equal(recipientAllowed('actual@example.com',{...env,APP_BASE_URL,SMTP_DELIVERY_MODE:'live'}),false);
 }
 assert.equal(recipientAllowed('',{...env,SMTP_PRESENTATION_RECIPIENTS:''}),false);
});
