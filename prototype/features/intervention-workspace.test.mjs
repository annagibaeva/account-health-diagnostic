import test from 'node:test';
import assert from 'node:assert/strict';
import {interventionRecord} from './intervention-workspace.mjs';
test('all intervention views resolve the same canonical deployment and linked records',()=>{
 const d={id:'DEP-1',actual:null},review={deploymentId:'DEP-1',decision:'Collect evidence'};
 const w={deployments:[d],outcomeReviews:[review],reproductionPackets:[{id:'P-1',deploymentId:'DEP-1'},{id:'P-2',deploymentId:'DEP-2'}],feedback:[{id:'F-1',deployment:'DEP-1'}]};
 const record=interventionRecord(w,'DEP-1');assert.equal(record.deployment,d);assert.equal(record.review,review);assert.deepEqual(record.issues.map(i=>i.id),['P-1']);assert.deepEqual(record.feedback.map(i=>i.id),['F-1']);d.actual=61;assert.equal(interventionRecord(w,'DEP-1').deployment.actual,61);assert.equal(interventionRecord(w,'missing'),null);
});
