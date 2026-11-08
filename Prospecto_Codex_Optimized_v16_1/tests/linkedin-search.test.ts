import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchedLinkedinProfiles} from '../lib/linkedin-search';

test('LinkedIn lookup only returns indexed person URLs with matching name and employer', () => {
  const profile = {
    url:'https://id.linkedin.com/in/maya-putri/?trk=search',
    title:'Maya Putri - Direktur | LinkedIn',
    description:'Direktur di Nusantara Raya.',
  };
  const match = (rows: unknown) => matchedLinkedinProfiles(rows, 'Maya Putri', 'PT Nusantara Raya Tbk');
  assert.deepEqual(match([profile, {...profile,url:'https://www.linkedin.com/in/maya-putri'}]),
    ['https://www.linkedin.com/in/maya-putri']);
  assert.deepEqual(match([
    {...profile,url:'https://linkedin.com.example.org/in/maya-putri'},
    {...profile,url:'https://www.linkedin.com/company/nusantara-raya'},
    {...profile,url:'https://www.linkedin.com/in/maya%2Fdetails'},
    {...profile,title:'Rina Maya Putri - Direktur | LinkedIn'},
    {...profile,description:'Direktur di perusahaan lain.'},
  ]), []);
  assert.deepEqual(matchedLinkedinProfiles([
    {...profile,title:'Maya Intan Putri Wibowo - Direktur di Nusantara Raya'},
  ], 'Maya Intan Putri', 'Nusantara Raya'), ['https://www.linkedin.com/in/maya-putri']);
});
