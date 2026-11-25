import './style.css';
import './schedules.css';
import fixtures from '../examples/schedules.json';
import { createAccount, createClient } from 'genlayer-studio';
import { studionet } from 'genlayer-studio/chains';
import { escape as e } from './proof.js';
import { scheduleProof, sha256, verifySchedule } from './schedule-proof.js';

const $ = id => document.getElementById(id);
const reader = createClient({ chain: studionet });
const key = 'orderglass-schedule-pending';
const initialQuery = new URLSearchParams(location.search);
const options = { transactionHashVariant: 'latest-final' };
const providers = new Map();
let deployment, verified, signer, writer, record, start = 0, order = '', activeTag = fixtures[0].tag;
let mode = 'demo', model, requestId = 0, busy = false;
const summaries = {
  ORDER_CONSTRAINED: 'Some orders stop before all three operations finish.',
  DIVERGENT: 'Completed orders can end in different states.',
  ORDER_FLEXIBLE: 'Every order completes with the same outcome for each start.',
  NO_SCHEDULE: 'No complete order exists within the declared model.',
  REVIEW: 'An operation rule is incomplete. Rehearsals remain disabled.',
  SEALED: 'Inputs are sealed. Compare them to compile the transition table.',
};
const stateName = value => record?.spec.states[Number(value)] ?? (value === 'BLOCKED' ? 'Blocked' : 'Unspecified');
const notice = message => { $('feedback').textContent = message; };
const txLink = hash => 'https://explorer-studio.genlayer.com/tx/' + encodeURIComponent(hash);
const pending = () => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};

function refreshWallets() {
  const selected = $('wallet').value;
  for (const [index, provider] of [window.ethereum, ...(window.ethereum?.providers ?? []),
    window.okxwallet?.ethereum ?? window.okxwallet].entries()) {
    if (provider?.request && ![...providers.values()].some(item => item.provider === provider)) {
      providers.set('injected-' + index, { provider, name: provider.isOkxWallet ? 'OKX' : 'Injected wallet' });
    }
  }
  $('wallet').innerHTML = providers.size
    ? [...providers].map(([id, entry]) => '<option value="' + e(id) + '">' + e(entry.name) + '</option>').join('')
    : '<option value="">No wallet detected</option>';
  if (providers.has(selected)) $('wallet').value = selected;
}
window.addEventListener('eip6963:announceProvider', event => {
  const { provider, info } = event.detail ?? {};
  if (provider?.request && info?.uuid) {
    providers.set(info.uuid, { provider, name: info.name });
    refreshWallets();
  }
});
window.dispatchEvent(new Event('eip6963:requestProvider'));
refreshWallets();

async function checkDeployment() {
  if (verified) return;
  if (!deployment?.address) throw Error('Schedule deployment is unavailable.');
  const expected = await (await fetch(import.meta.env.BASE_URL + 'schedules-source.json')).json();
  const code = await reader.getContractCode(deployment.address);
  if (await sha256(code) !== expected.sha256 ||
    await reader.readContract({ address: deployment.address, functionName: 'get_protocol', args: [], ...options }) !== expected.protocol) {
    throw Error('Schedule code or protocol mismatch.');
  }
  verified = true;
}

async function load(owner, tag) {
  if (!/^0x[0-9a-f]{40}$/i.test(owner) || !/^[a-zA-Z0-9_-]{1,48}$/.test(tag)) throw Error('Enter a valid owner and case ID.');
  const id = ++requestId;
  mode = 'live';
  activeTag = tag;
  $('owner').value = owner;
  $('tag').value = tag;
  record = null;
  render();
  notice('Reading finalized schedule…');
  await checkDeployment();
  const raw = await reader.readContract({ address: deployment.address, functionName: 'get_case',
    args: [owner.toLowerCase(), tag], ...options });
  if (id !== requestId) return;
  if (!raw) throw Error('No finalized schedule found for this reference.');
  const candidate = JSON.parse(raw);
  await verifySchedule(candidate);
  if (id !== requestId) return;
  if (candidate.owner !== owner.toLowerCase() || candidate.tag !== tag) throw Error('Schedule reference mismatch.');
  record = candidate;
  start = Number(candidate.rehearsal?.start ?? 0);
  order = candidate.rehearsal?.order ?? '';
  const url = new URL(location.href);
  url.search = new URLSearchParams({ owner, case: tag });
  history.replaceState(null, '', url);
  notice('Finalized schedule read and verified.');
  render();
}
function demo(fixture, preserveLink = false) {
  ++requestId;
  mode = 'demo';
  activeTag = fixture.tag;
  start = fixture.start;
  order = '';
  const proof = scheduleProof(fixture.vector, fixture.spec.states.length);
  record = { spec: fixture.spec, tag: fixture.tag, state: proof.state, proof };
  if (!preserveLink) history.replaceState(null, '', location.pathname);
  notice('');
  render();
}
function row() { return record?.proof?.rows[start]; }
function selectPath(next) {
  order = next;
  const path = row()?.paths.find(item => item.order === order);
  if (!path) return;
  $('routes').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.order === order)));
  model?.highlight(order);
  const items = ['<li><span>Start</span><strong>' + e(stateName(start)) + '</strong></li>'];
  let previous = start;
  path.steps.forEach((step, index) => {
    const opIndex = order.charCodeAt(index) - 65;
    const operation = record.spec.operations[opIndex];
    const cell = record.cells?.[opIndex * record.spec.states.length + Number(previous)];
    previous = step;
    items.push('<li class="' + (step === 'BLOCKED' || step === 'UNKNOWN' ? 'stopped' : '') + '"><span>' +
      e(operation.name) + '</span><strong>' + e(stateName(step)) + '</strong>' +
      (cell ? '<details><summary>Rule excerpt</summary><q>' + e(cell.quote) + '</q></details>' : '') + '</li>');
  });
  $('path-detail').innerHTML = '<h2>' + e(order) + (path.stopped_at ? ' · Stopped at ' + e(path.stopped_at) : ' · Complete') +
    '</h2><ol class="path-steps">' + items.join('') + '</ol>';
  updateButtons();
}
function renderRow() {
  const current = row();
  $('starts').innerHTML = (record?.spec.states ?? []).map((state, index) =>
    '<button data-start="' + index + '" aria-pressed="' + (index === start) + '">' + e(state) + '</button>').join('');
  $('visualization').hidden = !current || $('model').dataset.unavailable === 'true';
  $('routes').replaceChildren();
  $('path-detail').replaceChildren();
  if (!current) return;
  const renderRoutes = path => '<button data-order="' + path.order + '" class="' +
    (path.stopped_at ? path.result.toLowerCase() : 'complete') + '"><strong>' + path.order +
    '</strong><span>' + e(path.stopped_at ? 'Stops at ' + path.stopped_at : stateName(path.result)) + '</span></button>';
  $('routes').innerHTML = current.paths.map(renderRoutes).join('');
  model?.setPaths(current.paths);
  selectPath(order || current.allowed[0] || current.paths[0].order);
}
function updateButtons() {
  const saved = pending();
  $('track').hidden = !saved;
  $('track').textContent = saved?.hash ? 'Track saved transaction' : 'Check wallet before clearing submission';
  $('signer').textContent = signer ? signer.address : 'No signer connected';
  $('seal').disabled = busy || !signer || !!saved;
  $('compare').disabled = $('seal').disabled || record?.state !== 'SEALED';
  $('rehearse').disabled = $('seal').disabled || record?.owner !== signer?.address ||
    !row()?.allowed.includes(order) || ['REVIEW','NO_SCHEDULE','REHEARSED'].includes(record?.state);
}
function render() {
  $('workspace').hidden = mode !== 'live' || !deployment;
  $('live').disabled = !deployment;
  $('live').setAttribute('aria-pressed', String(mode === 'live'));
  $('demo').setAttribute('aria-pressed', String(mode === 'demo'));
  $('cases').innerHTML = fixtures.map(fixture => '<button data-case="' + fixture.tag + '" aria-current="' +
    (activeTag === fixture.tag ? 'true' : 'false') + '">' + e(fixture.spec.title) + '</button>').join('');
  $('record-heading').innerHTML = record ? '<div class="schedule-label">' +
    (mode === 'live' ? 'FINALIZED STUDIONET RECORD' : 'ILLUSTRATION') + '</div><h2>' +
    e(record.spec.title) + '</h2><p><b>' + e(record.state.replaceAll('_', ' ')) + '</b> · ' +
    e(summaries[record.proof?.state ?? record.state]) + '</p>' : '';
  $('case-reference').innerHTML = mode === 'live' && record ? '<div class="schedule-reference"><b>Case reference</b><code>' + e(record.owner) +
    ' / ' + e(record.tag) + '</code><a href="https://explorer-studio.genlayer.com/address/' + e(deployment.address) +
    '" target="_blank" rel="noreferrer">Contract ↗</a></div>' : '';
  const selectedEvidence = deployment?.cases?.[record?.tag];
  const published = mode === 'live' && selectedEvidence?.owner === record?.owner ? selectedEvidence : null;
  $('inspection').innerHTML = record ? '<details class="schedule-evidence"><summary>Rules and evidence</summary><p>' +
    e(record.spec.scope) + '</p><ul>' + record.spec.operations.map((operation, index) => '<li><b>' +
    'ABC'[index] + ' · ' + e(operation.name) + '</b><p>' + e(operation.rule) + '</p></li>').join('') + '</ul>' +
    (record.certificate ? '<p>Certificate <code>' + e(record.certificate) + '</code></p>' : '') +
    (record.rehearsal ? '<p>Recorded rehearsal <b>' + e(record.rehearsal.order) + '</b></p>' : '') +
    (published ? '<div class="receipt-links">' + Object.entries(published.transactions).map(([label, hash]) =>
      '<a href="' + txLink(hash) + '" target="_blank" rel="noreferrer">' + e(label) + ' ↗</a>').join('') + '</div>' : '') +
    '</details>' : '';
  renderRow();
  updateButtons();
}

async function useFixture(fixture, onChain) {
  if (!onChain) { demo(fixture); return; }
  const published = deployment?.cases?.[fixture.tag];
  if (!published) throw Error('This schedule has no published record.');
  await load(published.owner, fixture.tag);
}
async function sign() {
  const provider = providers.get($('wallet').value)?.provider;
  if (!provider) throw Error('Choose an available wallet.');
  const [address] = await provider.request({ method: 'eth_requestAccounts' });
  if (!address) throw Error('No account selected.');
  if (Number(await provider.request({ method: 'eth_chainId' })) !== 61999) {
    try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xf22f' }] }); }
    catch (error) {
      if (error.code !== 4902) throw error;
      await provider.request({ method: 'wallet_addEthereumChain', params: [{
        chainId: '0xf22f', chainName: 'GenLayer Stable Studionet', rpcUrls: ['https://studio.genlayer.com/api'],
        nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
      }] });
    }
  }
  if (Number(await provider.request({ method: 'eth_chainId' })) !== 61999) throw Error('Switch to Stable Studionet.');
  signer = { address: address.toLowerCase(), provider };
  writer = createClient({ chain: studionet, account: address, provider });
}
async function track() {
  const saved = pending();
  if (!saved?.hash) {
    if (saved && confirm('Clear the unresolved submission? Check the wallet for an existing transaction first.')) {
      localStorage.removeItem(key);
      notice('Unresolved submission cleared.');
    }
    return;
  }
  notice('Tracking ' + saved.hash + ' until FINALIZED…');
  await reader.waitForTransactionReceipt({ hash: saved.hash, waitUntil: 'finalized', interval: 4000, retries: 100 });
  const tx = await reader.getTransaction({ hash: saved.hash });
  if ((tx.statusName ?? tx.status_name) !== 'FINALIZED') throw Error('Transaction is still pending.');
  const leaders = tx.consensus_data?.leader_receipt;
  const lead = Array.isArray(leaders) ? leaders.find(entry => entry.mode === 'leader') ?? leaders[0] : leaders;
  if (!lead?.execution_result) throw Error('Execution receipt unavailable. Keep tracking the saved hash.');
  localStorage.removeItem(key);
  if (lead.execution_result !== 'SUCCESS') {
    notice('FINALIZED / ' + lead.execution_result + ' · ' + saved.hash);
    return;
  }
  await load(saved.owner, saved.tag);
  notice('FINALIZED / SUCCESS · Verified readback · ' + saved.hash);
}
async function send(method, args, owner, tag) {
  if (!writer || pending()) throw Error('Connect a signer and resolve any saved transaction first.');
  if (signer.provider) {
    const [wallet] = await signer.provider.request({ method: 'eth_accounts' });
    if (wallet?.toLowerCase() !== signer.address ||
        Number(await signer.provider.request({ method: 'eth_chainId' })) !== 61999) throw Error('Reconnect your Stable Studionet wallet.');
  }
  await checkDeployment();
  const fees = await reader.estimateTransactionFees({
    leaderTimeunitsAllocation: 300n, validatorTimeunitsAllocation: 300n, rotations: [0n],
  });
  const saved = { owner, tag, method };
  localStorage.setItem(key, JSON.stringify(saved));
  notice('Waiting for the Studionet signature…');
  try {
    saved.hash = await writer.writeContract({ address: deployment.address, functionName: method, args, value: 0n, leaderOnly: false, fees });
    localStorage.setItem(key, JSON.stringify(saved));
  } catch (error) {
    if (error.code === 4001 || error.cause?.code === 4001) localStorage.removeItem(key);
    throw error;
  }
  await track();
}
async function act(callback) {
  if (busy) return;
  busy = true;
  updateButtons();
  try { await callback(); }
  catch (error) { notice(error.message ?? String(error)); }
  finally { busy = false; updateButtons(); }
}

$('cases').addEventListener('click', event => {
  const button = event.target.closest('[data-case]');
  if (button) act(() => useFixture(fixtures.find(item => item.tag === button.dataset.case), mode === 'live'));
});
$('starts').addEventListener('click', event => {
  const button = event.target.closest('[data-start]');
  if (button) { start = Number(button.dataset.start); order = ''; renderRow(); }
});
$('routes').addEventListener('click', event => {
  const button = event.target.closest('[data-order]');
  if (button) selectPath(button.dataset.order);
});
$('demo').onclick = () => act(() => demo(fixtures[0]));
$('live').onclick = () => act(() => useFixture(fixtures[0], true));
$('replay').onclick = () => model?.replay();
$('reset-camera').onclick = () => model?.reset();
$('read').onclick = () => act(() => load($('owner').value.trim(), $('tag').value.trim()));
$('connect').onclick = () => act(async () => { await sign(); notice('Wallet connected to Stable Studionet.'); });
$('temporary').onclick = () => act(async () => {
  const account = createAccount();
  await reader.request({ method: 'sim_fundAccount', params: [account.address, 10 ** 18] });
  writer = createClient({ chain: studionet, account });
  signer = { address: account.address.toLowerCase() };
  notice('Funded test account connected. Its key stays in page memory.');
});
$('seal').onclick = () => act(async () => {
  const tag = $('tag').value.trim();
  const spec = JSON.parse($('payload').value);
  if (!/^[a-zA-Z0-9_-]{1,48}$/.test(tag)) throw Error('Choose a valid case ID.');
  await send('open_case', [tag, JSON.stringify(spec)], signer.address, tag);
});
$('compare').onclick = () => act(() => send('compare', [record.owner, record.tag], record.owner, record.tag));
$('rehearse').onclick = () => act(() => send('rehearse', [record.tag, record.certificate, start, order], record.owner, record.tag));
$('track').onclick = () => act(track);
$('payload').value = JSON.stringify(fixtures[0].spec, null, 2);
demo(fixtures[0], true);

void import('./schedule-model.js').then(({ createScheduleModel }) =>
  createScheduleModel($('model'), selectPath)
).catch(async () => {
  const { createScheduleProjection } = await import('./schedule-projection.js');
  return createScheduleProjection($('model'), selectPath);
}).then(created => {
  model = created;
  renderRow();
}).catch(() => {
  $('model').dataset.unavailable = 'true';
  $('visualization').hidden = true;
});
try {
  const response = await fetch(import.meta.env.BASE_URL + 'schedules-deployment.json');
  if (!response.ok) throw Error('No deployment manifest.');
  deployment = await response.json();
  if (initialQuery.has('owner') && initialQuery.has('case')) await act(() => load(initialQuery.get('owner'), initialQuery.get('case')));
  else await act(() => useFixture(fixtures[0], true));
} catch { render(); }
