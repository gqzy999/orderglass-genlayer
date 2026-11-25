import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createAccount, createClient, abi } from 'genlayer-studio';
import { generatePrivateKey } from 'viem/accounts';
import { studionet } from 'genlayer-studio/chains';
import { verifySchedule } from '../src/schedule-proof.js';

const code = readFileSync(new URL('../contracts/orderglass_schedules.py', import.meta.url), 'utf8');
const fixtures = JSON.parse(readFileSync(new URL('../examples/schedules.json', import.meta.url)));
const filename = new URL('../evidence/schedules-studionet.json', import.meta.url);
const execute = process.argv.includes('--execute');
const deployOnly = process.argv.includes('--deploy-only');
const reader = createClient({ chain: studionet });
assert.equal(studionet.rpcUrls.default.http[0], 'https://studio.genlayer.com/api');
assert.equal(BigInt(await reader.request({ method: 'eth_chainId' })), 61999n);
const sourceSha256 = createHash('sha256').update(code).digest('hex');
let proof;
try { proof = JSON.parse(readFileSync(filename)); }
catch (error) {
  if (error.code !== 'ENOENT' || !execute) throw error;
  proof = { chainId: 61999, sourceSha256, deployment: {}, cases: {} };
}
assert.equal(proof.sourceSha256, sourceSha256);
const save = () => writeFileSync(filename, JSON.stringify(proof, null, 2) + '\n');

async function retry(read) {
  for (let i = 0; ; i++) {
    try { return await read(); }
    catch (error) {
      if (i >= 4 || !/fetch failed|timeout|429|503/i.test(String(error))) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}
async function receipt(hash, expectedError = '') {
  await retry(() => reader.waitForTransactionReceipt({ hash, waitUntil: 'finalized', interval: 3500, retries: 135 }));
  const tx = await retry(() => reader.getTransaction({ hash }));
  const leaders = tx.consensus_data.leader_receipt;
  const leader = Array.isArray(leaders) ? leaders.find(entry => entry.mode === 'leader') ?? leaders[0] : leaders;
  const raw = Buffer.from(typeof leader.result === 'string' ? leader.result : leader.result.raw, 'base64');
  const status = tx.statusName ?? tx.status_name;
  assert.equal(status, 'FINALIZED');
  if (expectedError) {
    assert.notEqual(leader.execution_result, 'SUCCESS');
    assert.equal(raw[0], 1, JSON.stringify(leader.genvm_result));
    assert.equal(raw.subarray(1).toString('utf8'), expectedError);
  } else assert.equal(leader.execution_result, 'SUCCESS', JSON.stringify(leader.genvm_result));
  return { status, execution: leader.execution_result, ...(expectedError ? { error: expectedError } : {}),
    destination: tx.data?.contract_address ?? tx.to_address ?? tx.recipient,
    calldata: tx.data?.calldata?.base64 };
}
async function faucet(key) {
  const account = createAccount(key);
  const client = createClient({ chain: studionet, account });
  await client.request({ method: 'sim_fundAccount', params: [account.address, 10 ** 18] });
  return { client, address: account.address.toLowerCase() };
}
const fees = execute ? await retry(() => reader.estimateTransactionFees({
  leaderTimeunitsAllocation: 300n, validatorTimeunitsAllocation: 300n, rotations: [0n],
})) : undefined;
if (!proof.deployment.hash) {
  assert.ok(execute);
  const { client } = await faucet();
  proof.deployment.hash = await client.deployContract({ code, args: [], leaderOnly: false, fees });
  save();
  console.error('deployment', proof.deployment.hash);
}
const deployment = await receipt(proof.deployment.hash);
const address = deployment.destination;
assert.equal(await retry(() => reader.getContractCode(address)), code);
if (execute) {
  proof.address = address;
  Object.assign(proof.deployment, { status: deployment.status, execution: deployment.execution });
  save();
} else assert.equal(proof.address, address);
if (deployOnly) process.exit(0);

const canonical = value => JSON.stringify(value, (_, x) => typeof x === 'bigint' ? Number(x) : x);
for (const fixture of fixtures) {
  if (!proof.cases[fixture.tag]) {
    assert.ok(execute);
    proof.cases[fixture.tag] = { expected: fixture.expected, transactions: {} };
  }
}
const results = await Promise.allSettled(fixtures.map(async fixture => {
  const example = proof.cases[fixture.tag];
  let signer = null;
  if (execute && Object.keys(example.transactions).length < 2 + Number(Boolean(fixture.reject)) + Number(Boolean(fixture.accept))) {
    const dir = new URL('../.private/', import.meta.url);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const keyPath = new URL('schedules-' + fixture.tag + '.key', dir);
    let key;
    try { key = readFileSync(keyPath, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT' || example.owner) throw error;
      key = generatePrivateKey();
      writeFileSync(keyPath, key, { mode: 0o600, flag: 'wx' });
    }
    const account = createAccount(key);
    if (example.owner) {
      assert.equal(account.address.toLowerCase(), example.owner);
      signer = { client: createClient({ chain: studionet, account }), address: example.owner };
    } else {
      signer = await faucet(key);
      example.owner = signer.address;
      save();
    }
  }
  const owner = example.owner;
  const read = async () => {
    const value = await retry(() => reader.readContract({ address, functionName: 'get_case',
      args: [owner, fixture.tag], transactionHashVariant: 'latest-final' }));
    const record = JSON.parse(value);
    if (record.proof) await verifySchedule(record);
    return record;
  };
  async function step(key, method, args, expectedError) {
    let recorded = example.transactions[key];
    if (!recorded) {
      assert.ok(execute && signer, 'Missing transaction for an existing signer. Recheck the recorded hashes before resending.');
      const hash = await signer.client.writeContract({ address, functionName: method, args, value: 0n, leaderOnly: false, fees });
      recorded = example.transactions[key] = { hash, method, args };
      save();
      console.error(fixture.tag, key, hash);
    }
    const res = await receipt(recorded.hash, expectedError);
    const call = abi.calldata.decode(Buffer.from(res.calldata, 'base64'));
    assert.equal(call.get(''), method);
    assert.equal(canonical(call.get('args')), canonical(args));
    assert.equal(res.destination.toLowerCase(), address.toLowerCase());
    if (execute) {
      Object.assign(recorded, { status: res.status, execution: res.execution, ...(res.error ? { error: res.error } : {}) });
      save();
    }
  }
  await step('seal', 'open_case', [fixture.tag, JSON.stringify(fixture.spec)]);
  await step('compare', 'compare', [owner, fixture.tag]);
  const compared = await read();
  assert.equal(compared.proof.state, fixture.expected);
  assert.deepEqual(compared.cells.map(cell => cell.result), fixture.vector);
  if (fixture.reject) await step('reject', 'rehearse', [fixture.tag, compared.certificate, fixture.start, fixture.reject],
    fixture.expected === 'REVIEW' || fixture.expected === 'NO_SCHEDULE' ? 'NOT_REHEARSABLE' : 'ORDER_BLOCKED');
  if (fixture.accept) await step('rehearse', 'rehearse', [fixture.tag, compared.certificate, fixture.start, fixture.accept]);
  const result = await read();
  assert.equal(result.state, fixture.accept ? 'REHEARSED' : fixture.expected);
  if (fixture.accept) assert.equal(result.rehearsal.order, fixture.accept);
  else assert.equal(result.rehearsal, null);
  if (execute) {
    example.readback = result;
    save();
  } else assert.deepEqual(result, example.readback);
  console.log(fixture.tag, result.state, 'verified');
}));
if (results.some(result => result.status === 'rejected')) {
  for (const [index, result] of results.entries()) if (result.status === 'rejected') console.error(fixtures[index].tag, result.reason);
  process.exitCode = 1;
}
