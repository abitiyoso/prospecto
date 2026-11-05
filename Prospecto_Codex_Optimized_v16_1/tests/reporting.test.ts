import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dateInput,reportBounds,ratePercent,reportingInput} from '../lib/commercial';
test('report bounds include the complete local day with an exclusive end',()=>{
 assert.deepEqual(reportBounds('2026-11-05','2026-11-05','Asia/Jakarta'),{from:'2026-11-04T17:00:00.000Z',to:'2026-11-05T17:00:00.000Z',campaign_id:null});
 assert.equal(reportBounds('2026-11-05','2026-11-05','Asia/Jayapura').from,'2026-11-04T15:00:00.000Z');
 assert.equal(dateInput(new Date('2026-11-04T18:00:00Z'),'Asia/Jakarta'),'2026-11-05');
});
test('invalid reversed or oversized reporting ranges are rejected',()=>{
 assert.throws(()=>reportBounds('2026-11-06','2026-11-05','Asia/Jakarta'));
 assert.throws(()=>reportBounds('2024-01-01','2026-11-05','Asia/Jakarta'));
 assert.equal(reportingInput.safeParse({from:'bad',to:'bad'}).success,false);
});
test('undefined analytics ratios remain empty instead of inventing success',()=>{
 assert.equal(ratePercent(0,0),'—');assert.equal(ratePercent(0,2),'0%');assert.equal(ratePercent(1,2),'50%');
});
