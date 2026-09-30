import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveInbox,localToday} from './action-inbox.mjs';
const deployment={id:'D1',title:'Pilot',owner:'Maya',status:'In progress',due:'2026-10-01',actual:0,observed:'2026-09-30',evidence:'Measured',quality:'Passed'};
test('overdue work appears, completed work is excluded from overdue queue',()=>{
  const result=deriveInbox({deployments:[deployment,{...deployment,id:'D2',status:'Complete'}]},'2026-10-02');
  assert.equal(result.length,1);assert.match(result[0].reasons[0],/Overdue/);
});
test('missing measurement is unavailable, while measured zero is retained',()=>{
  const result=deriveInbox({deployments:[{...deployment,actual:null},{...deployment,id:'D2'}]},'2026-10-02');
  assert.equal(result[0].actual,null);assert.ok(result[0].reasons.some(r=>r.startsWith('Outcome evidence')));
  assert.equal(result[1].actual,0);assert.ok(!result[1].reasons.some(r=>r.startsWith('Outcome evidence')));
});
test('blocked prioritizes before overdue and due soon includes seven days',()=>{
  const result=deriveInbox({deployments:[{...deployment,id:'late',due:'2026-09-01'},{...deployment,id:'blocked',status:'Blocked',due:'2026-12-01'},{...deployment,id:'soon',due:'2026-10-07'},{...deployment,id:'later',due:'2026-10-08'}]},'2026-09-30');
  assert.deepEqual(result.map(r=>r.sourceId),['blocked','late','soon']);
});
test('completed execution still surfaces pending review and feedback routes to source',()=>{
  const result=deriveInbox({deployments:[{...deployment,status:'Complete',quality:'Not assessed'}],feedback:[{id:'F1',status:'Needs reproduction',owner:''},{id:'F2',status:'Resolved'}]},'2026-10-02');
  assert.equal(result.length,2);assert.equal(result.find(r=>r.source==='feedback').owner,'Unassigned');
  assert.ok(!result.find(r=>r.source==='deployment').reasons.some(r=>r.startsWith('Overdue')));
});
test('empty workspace and invalid dates are handled explicitly',()=>{
  assert.deepEqual(deriveInbox({},'2026-09-30'),[]);
  assert.throws(()=>deriveInbox({},'2026-02-31'));
  assert.match(deriveInbox({deployments:[{...deployment,due:'nonsense'}]},'2026-09-30')[0].reasons[0],/unavailable/);
  assert.equal(localToday(new Date(2026,8,30,23,59)),'2026-09-30');
});
