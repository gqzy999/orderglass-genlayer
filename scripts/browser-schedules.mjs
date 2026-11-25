import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { createClient } from 'genlayer-studio';
import { studionet } from 'genlayer-studio/chains';
import { verifySchedule } from '../src/schedule-proof.js';

const out = new URL('../browser-observations/', import.meta.url);
mkdirSync(out, { recursive: true });
const fixture = JSON.parse(readFileSync(new URL('../examples/schedules.json', import.meta.url)))[0];
const deployment = JSON.parse(readFileSync(new URL('../public/schedules-deployment.json', import.meta.url)));
const tag = 'browser-' + (process.env.GITHUB_RUN_ID || Date.now()) + '-' + (process.env.GITHUB_RUN_ATTEMPT || '1');
assert.match(tag, /^[a-zA-Z0-9_-]{1,48}$/);
const evidence = { chainId: 61999, contract: deployment.address, tag, signerType: 'temporary test account', transactions: {}, observations: [] };
const save = () => writeFileSync(new URL('lifecycle.json', out), JSON.stringify(evidence, null, 2) + '\n');
let browser, page;
const timeout = 420000;
try {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#feedback').textContent === 'Finalized schedule read and verified.', null, { timeout: 90000 });
  await page.locator('#workspace summary').click();
  await page.locator('#temporary').click();
  await page.waitForFunction(() => /^0x[0-9a-f]{40}$/i.test(document.querySelector('#signer').textContent), null, { timeout: 90000 });
  evidence.owner = await page.locator('#signer').textContent();
  assert.match(evidence.owner, /^0x[0-9a-f]{40}$/);
  await page.locator('#tag').fill(tag);
  await page.locator('#payload').fill(JSON.stringify(fixture.spec));
  async function transact(button, name, state) {
    const old = await page.locator('#feedback').textContent();
    await page.locator(button).click();
    await page.waitForFunction(previous => {
      const message = document.querySelector('#feedback').textContent;
      return message !== previous && /^FINALIZED \/ SUCCESS · Verified readback · 0x[0-9a-fA-F]{64}$/.test(message);
    }, old, { timeout });
    const message = await page.locator('#feedback').textContent();
    evidence.transactions[name] = { hash: message.match(/0x[0-9a-fA-F]{64}$/)[0], status: 'FINALIZED', execution: 'SUCCESS' };
    assert.match(await page.locator('#record-heading').textContent(), new RegExp(state));
    evidence.observations.push({ step: name, state });
    save();
  }
  await transact('#seal', 'seal', 'SEALED');
  await transact('#compare', 'compare', 'ORDER CONSTRAINED');
  assert.equal(await page.locator('#routes button').count(), 6);
  await page.locator('#starts [data-start="0"]').click();
  await page.locator('#routes [data-order="BAC"]').click();
  assert.equal(await page.locator('#rehearse').isDisabled(), true);
  evidence.observations.push({ step: 'blocked-order', order: 'BAC', rehearsalDisabled: true });
  await page.locator('#routes [data-order="ABC"]').click();
  assert.equal(await page.locator('#rehearse').isEnabled(), true);
  await transact('#rehearse', 'rehearse', 'REHEARSED');
  const reader = createClient({ chain: studionet });
  assert.equal(BigInt(await reader.request({ method: 'eth_chainId' })), 61999n);
  const record = JSON.parse(await reader.readContract({ address: deployment.address, functionName: 'get_case',
    args: [evidence.owner, tag], transactionHashVariant: 'latest-final' }));
  await verifySchedule(record);
  assert.equal(record.owner, evidence.owner);
  assert.equal(record.tag, tag);
  assert.equal(record.state, 'REHEARSED');
  assert.equal(record.proof.state, fixture.expected);
  assert.deepEqual(record.cells.map(cell => cell.result), fixture.vector);
  assert.equal(record.rehearsal.order, 'ABC');
  assert.deepEqual(record.rehearsal.steps, ['1', '2', '2']);
  evidence.readback = record;
  evidence.result = 'success';
  console.log(JSON.stringify({ owner: evidence.owner, tag, transactions: evidence.transactions, state: record.state }));
} catch (error) {
  evidence.result = 'error';
  evidence.error = String(error);
  if (page) {
    evidence.feedback = await page.locator('#feedback').textContent({ timeout: 1000 }).catch(() => '');
    const pending = await page.evaluate(() => localStorage.getItem('orderglass-schedule-pending')).catch(() => null);
    if (pending) evidence.pending = JSON.parse(pending);
  }
  throw error;
} finally {
  save();
  if (page) await page.screenshot({ path: new URL('browser.png', out).pathname, fullPage: true }).catch(() => {});
  if (browser) await browser.close();
}
