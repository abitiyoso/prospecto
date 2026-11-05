import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emailToken,emailDestination} from '../lib/auth-email';
test('email confirmation accepts only supported token types and bounded safe hashes',()=>{
 for(const type of ['email','recovery'])assert.ok(emailToken.safeParse({type,token_hash:'a'.repeat(64)}).success);
 for(const token_hash of ['', 'a'.repeat(513),'a\"/><script>bad</script>'])assert.equal(emailToken.safeParse({type:'recovery',token_hash}).success,false);
 assert.equal(emailToken.safeParse({type:'invite',token_hash:'a'.repeat(64)}).success,false);
});
test('email verification has fixed same-origin destinations',()=>{
 assert.equal(emailDestination('email'),'/app');assert.equal(emailDestination('recovery'),'/auth/password');
});
