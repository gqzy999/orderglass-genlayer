import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonical } from '../src/proof.js';
import { ORDERS, scheduleProof, sha256, verifySchedule } from '../src/schedule-proof.js';

const fixtures = JSON.parse(readFileSync(new URL('../examples/schedules.json', import.meta.url)));

for (const fixture of fixtures) {
  test(fixture.tag + ' derives six distinct orders per start', () => {
    const proof = scheduleProof(fixture.vector, fixture.spec.states.length);
    assert.equal(proof.state, fixture.expected);
    for (const row of proof.rows) {
      assert.deepEqual(row.paths.map(path => path.order), ORDERS);
      for (const path of row.paths) {
        if (path.stopped_at) assert.equal(path.order[path.steps.length - 1], path.stopped_at);
        else assert.equal(path.steps.length, 3);
      }
    }
  });
}

test('only ABC succeeds from Closed and a tampered path fails verification', async () => {
  const { spec, vector } = fixtures[0];
  const protocol = 'orderglass-2';
  const proof = scheduleProof(vector, spec.states.length);
  assert.deepEqual(proof.rows[0].allowed, ['ABC']);
  const input_hash = await sha256(canonical(spec));
  const certificate = await sha256(canonical({ protocol, input_hash, vector, proof }));
  const cells = vector.map((result, index) => ({ result,
    quote: spec.operations[Math.floor(index / spec.states.length)].rule, reason: 'Fixture rule.' }));
  const record = { protocol, input_hash, spec, cells, state: proof.state, proof, certificate };
  await verifySchedule(record);
  record.proof.rows[0].paths[0].steps[1] = '0';
  await assert.rejects(verifySchedule(record), /Schedule proof mismatch/);
});
