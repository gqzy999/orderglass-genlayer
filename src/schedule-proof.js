import { canonical } from './proof.js';

export const ORDERS = ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'];
export const STOPPED = ['BLOCKED', 'UNKNOWN'];

export function scheduleProof(vector, size) {
  if (vector.length !== 3 * size || vector.some(cell =>
    !STOPPED.includes(cell) && (!/^[0-5]$/.test(cell) || Number(cell) >= size))) {
    throw Error('Invalid schedule transition table.');
  }
  const rows = Array.from({ length: size }, (_, index) => {
    const start = String(index);
    const paths = ORDERS.map(order => {
      const steps = [];
      let result = start;
      for (const operation of order) {
        result = vector[(operation.charCodeAt(0) - 65) * size + Number(result)];
        steps.push(result);
        if (STOPPED.includes(result)) return { order, steps, result, stopped_at: operation };
      }
      return { order, steps, result, stopped_at: '' };
    });
    const complete = paths.filter(path => !path.stopped_at);
    return { start, paths, allowed: complete.map(path => path.order),
      ends: [...new Set(complete.map(path => path.result))].sort() };
  });
  let state = 'ORDER_FLEXIBLE';
  if (vector.includes('UNKNOWN')) state = 'REVIEW';
  else if (!rows.some(row => row.allowed.length)) state = 'NO_SCHEDULE';
  else if (rows.some(row => row.ends.length > 1)) state = 'DIVERGENT';
  else if (rows.some(row => row.allowed.length !== ORDERS.length)) state = 'ORDER_CONSTRAINED';
  return { state, rows };
}

export async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifySchedule(record) {
  const { protocol, spec, cells, proof, input_hash, certificate, state, rehearsal } = record;
  if (protocol !== 'orderglass-2' || spec.operations.length !== 3 ||
      await sha256(canonical(spec)) !== input_hash) throw Error('Schedule input integrity mismatch.');
  if (!proof) {
    if (state !== 'SEALED' || cells.length || certificate || rehearsal) throw Error('Invalid sealed record.');
    return;
  }
  const size = spec.states.length;
  const vector = cells.map((cell, index) => {
    if (typeof cell.quote !== 'string' || cell.quote.length < 6 ||
        !spec.operations[Math.floor(index / size)]?.rule.includes(cell.quote)) throw Error('Evidence quote mismatch.');
    return cell.result;
  });
  if (canonical(scheduleProof(vector, size)) !== canonical(proof)) throw Error('Schedule proof mismatch.');
  if (await sha256(canonical({ protocol, input_hash, vector, proof })) !== certificate) throw Error('Certificate mismatch.');
  if (state !== (rehearsal ? 'REHEARSED' : proof.state)) throw Error('Invalid schedule state.');
  if (rehearsal) {
    const path = proof.rows[Number(rehearsal.start)]?.paths.find(item => item.order === rehearsal.order);
    if (!path || path.stopped_at || proof.state === 'REVIEW' || rehearsal.certificate !== certificate ||
        rehearsal.end !== path.result || canonical(rehearsal.steps) !== canonical(path.steps)) throw Error('Invalid rehearsal.');
  }
}
