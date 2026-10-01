import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspace} from '../diagnostic.mjs';
import {reviewFingerprint} from './outcome-review.mjs';
import {createExampleIntervention,loadExampleIntervention,customerDecisionCurrent,recordCustomerDecision,validateCustomerDecision} from './intervention-case.mjs';
import {recommendationEvidence} from './evidence.mjs';
import {evidence} from '../evidence-data.mjs';

test('manual example stays review-current across reload evidence initialization',()=>{
 const w=initialWorkspace();loadExampleIntervention(w);const reloaded=JSON.parse(JSON.stringify(w));
 for(const d of reloaded.deployments)d.recommendationEvidence??=recommendationEvidence(d,evidence);
 const d=reloaded.deployments.at(-1);assert.equal(reloaded.outcomeReviews.at(-1).evidenceSnapshot,reviewFingerprint(d));assert.equal(customerDecisionCurrent(d),true);
});
test('example is opt-in, additive, idempotent and explicit about missed target and synthetic approval',()=>{
 const w=initialWorkspace(),before=structuredClone(w.deployments);w.successPlan={customerGoal:'Preserve my goal',objectives:[{id:'EXISTING',title:'Existing goal'}]};assert.equal(loadExampleIntervention(w),true);assert.deepEqual(w.deployments.slice(0,before.length),before);assert.equal(loadExampleIntervention(w),false);assert.equal(w.successPlan.customerGoal,'Preserve my goal');assert.equal(w.successPlan.objectives.length,2);assert.equal(w.successPlan.objectives[0].title,'Existing goal');assert.deepEqual(w.successPlan.objectives[1].deploymentIds,[w.deployments.at(-1).id]);
 const d=w.deployments.at(-1);assert.equal(d.synthetic,true);assert(d.actual>d.target);assert.equal(d.customerDecision.synthetic,true);assert.equal(d.customerDecision.decision,'Revise');assert.equal(w.outcomeReviews.at(-1).evidenceSnapshot,reviewFingerprint(d));assert.equal(customerDecisionCurrent(d),true);assert.equal(d.links,'');
});
test('customer decision requires attributable dated source and becomes stale after intervention changes',()=>{
 const d=createExampleIntervention();assert.throws(()=>recordCustomerDecision(d,{...d.customerDecision,source:''}),/required/);assert.throws(()=>recordCustomerDecision(d,{...d.customerDecision,date:'2026-02-30'}),/valid/);
 for(const patch of [{actual:22},{action:'Different action'},{due:'2026-10-01'},{workflowOutcome:{mode:'delegated'}}])assert.equal(customerDecisionCurrent({...d,...patch}),false);
 assert.throws(()=>recordCustomerDecision(d,{...d.customerDecision,decision:'Expand'}),/Expansion requires/);
 const next=recordCustomerDecision({...d,actual:22},{...d.customerDecision,rationale:'New customer review'});assert.equal(customerDecisionCurrent(next),true);
 assert.equal(validateCustomerDecision(d,d.customerDecision),true);assert.throws(()=>validateCustomerDecision(d,{...d.customerDecision,synthetic:false}),/example label/);assert.throws(()=>validateCustomerDecision({...d,actual:10},d.customerDecision),/outdated/);
});
