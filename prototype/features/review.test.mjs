import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialWorkspace} from '../diagnostic.mjs';
import {canExpand,reviewFingerprint} from './outcome-review.mjs';
import {qbrSource,qbrText,approvalCurrent} from './reviewed-qbr.mjs';
test('unmeasured outcomes cannot expand; guardrail failure blocks expansion',()=>{const d=initialWorkspace().deployments[0];assert.equal(canExpand(d),false);assert.equal(canExpand({...d,actual:60,observed:'2026-10-14',quality:'Failed'}),false);assert.equal(canExpand({...d,actual:60,observed:'2026-10-14',quality:'Passed'}),true)});
test('source changes invalidate review and QBR approval',()=>{const w=initialWorkspace();w.successPlan={customerGoal:'Goal'};w.reviewedQbr={narrative:'Next step',approval:{source:qbrSource(w),narrative:'Next step'}};assert.equal(approvalCurrent(w),true);const before=reviewFingerprint(w.deployments[0]);w.deployments[0].target=70;assert.notEqual(reviewFingerprint(w.deployments[0]),before);assert.equal(approvalCurrent(w),false)});
test('QBR excludes internal notes, feedback and reviewer rationale',()=>{const w=initialWorkspace();w.successPlan={customerGoal:'Goal',notes:'PRIVATE NOTE'};w.feedback[0].evidence='PRIVATE FEEDBACK';const text=qbrText(w);assert(!text.includes('PRIVATE'));assert(text.includes('No current reviewed outcomes'))});
