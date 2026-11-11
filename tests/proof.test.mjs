import {test} from 'node:test';import assert from 'node:assert/strict';import {prove,escape} from '../src/proof.js';import {succeeded} from '../src/transport.js';
test('counterexample preserves both intermediate states',()=>{const p=prove(['0','1','0','1','0','1','3','3'],4);assert.equal(p.state,'ORDER_SENSITIVE');assert.deepEqual(p.counterexamples,['2']);assert.deepEqual(p.rows[2].ab.steps,['0','0']);assert.deepEqual(p.rows[2].ba.steps,['3','1']);});
test('independent writes commute over every start',()=>{const p=prove(['0','1','0','1','1','1','3','3'],4);assert.equal(p.state,'COMMUTES');assert.equal(p.usable_starts.length,4);});
test('unknown blocks certification even outside composed paths',()=>assert.equal(prove(['0','0','0','UNKNOWN'],2).state,'REVIEW'));
test('blocked operations stop instead of acting as identity',()=>{assert.equal(prove(['BLOCKED','BLOCKED','0','1'],2).state,'NO_COMMON_DOMAIN');assert.equal(prove(['1','1','BLOCKED','0'],2).state,'ORDER_SENSITIVE');});
test('script-bearing text is escaped',()=>assert.equal(escape('<script>'), '&lt;script&gt;'));
test('accepted and finalized error are never success',()=>{assert.equal(succeeded({status:6,result:6,consensus_data:{leader_receipt:{execution_result:'SUCCESS'}}}),false);assert.equal(succeeded({status:7,result:6,consensus_data:{leader_receipt:{execution_result:'ERROR'}}}),false);});
