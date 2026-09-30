import test from 'node:test';
import assert from 'node:assert/strict';
import {packetCompleteness, packetExport} from './reproduction-packet.mjs';

test('packet readiness rejects missing and whitespace reproduction evidence', () => {
  const result = packetCompleteness({title:'Case',environment:' ',steps:'Do task',expected:'Success',actual:'Failure',owner:'Engineer'});
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, ['environment']);
});
test('complete reproduction describes an investigation, not an automated confirmation', () => {
  assert.equal(packetCompleteness({title:'Case',environment:'Test repository',steps:'1. Open task',expected:'Success',actual:'Failure',owner:'Engineer'}).complete, true);
});
test('exports require fresh human confirmation and exclude unapproved extra fields', () => {
  assert.throws(() => packetExport({id:'REP-1'}, false), /manual/);
  const result = packetExport({id:'REP-1',rawSupportTicket:'private',sanitizedEvidence:'Reviewed sample'}, true);
  assert.equal(result.sanitizedEvidence, 'Reviewed sample');
  assert.equal(Object.hasOwn(result, 'rawSupportTicket'), false);
  assert.match(result.notice, /sanitization is not automated/);
});
