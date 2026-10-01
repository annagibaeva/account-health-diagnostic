import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialWorkspace} from '../diagnostic.mjs';
import {reviewFingerprint} from './outcome-review.mjs';
import {qbrSource,qbrText,validateQbr,qbrExport,approvalCurrent} from './reviewed-qbr.mjs';
import {pdfLines,onePagePdf} from './qbr-pdf.mjs';
import {evidence} from '../evidence-data.mjs';
import {linkMeasurement} from './evidence.mjs';
function reviewed(){const w=initialWorkspace();w.successPlan={customerGoal:'Evaluate maintenance workflows',notes:'PRIVATE'};const d=w.deployments[0];d.actual=55;d.observed='2026-09-28';d.evidence='Human-entered sample';w.outcomeReviews=[{deploymentId:d.id,decision:'Collect evidence',notes:'PRIVATE',evidenceSnapshot:reviewFingerprint(d)}];return w}
function approve(w){w.reviewedQbr={narrative:'Continue the pilot.',approval:{source:qbrSource(w),narrative:'Continue the pilot.',reviewer:'Demo reviewer',at:'2026-09-30'}};return w}
test('numeric and causal narratives cannot be approved as facts',()=>{const w=reviewed();for(const text of ['Acceptance improved 10%.','We doubled productivity.','This caused faster delivery.','We saved engineering effort.'])assert.ok(validateQbr(w,text).length);assert.deepEqual(validateQbr(w,'Continue the pilot.'),[])});
test('manual references are labeled and private details excluded',()=>{const text=qbrText(reviewed());assert.match(text,/\[E1\]/);assert.match(text,/manual, not independently verified/);assert.ok(!text.includes('PRIVATE'))});
test('mismatched telemetry blocks export even after local approval',()=>{const w=reviewed(),d=w.deployments[0];d.outcomeEvidence={id:'fake',value:1};w.outcomeReviews[0].evidenceSnapshot=reviewFingerprint(d);approve(w);assert.equal(approvalCurrent(w),false);assert.throws(()=>qbrExport(w),/approval/) });
test('PDF enforces a single page and safely escapes PDF operators',()=>{const w=approve(reviewed()),pdf=new TextDecoder().decode(qbrExport(w));assert.match(pdf,/%PDF-1.4/);assert.match(pdf,/\/Count 1/);assert.throws(()=>pdfLines('x\n'.repeat(66)),/one-page limit/);assert.throws(()=>onePagePdf('中文'),/unsupported/);assert.match(new TextDecoder().decode(onePagePdf('a(b)\\c')),/a\\\(b\\\)\\\\c/)});
test('changing team label invalidates approval, overflow never truncates',()=>{const w=approve(reviewed());w.deployments[0].team='Changed';assert.equal(approvalCurrent(w),false);w.successPlan.customerGoal='long '.repeat(2000);approve(w);assert.throws(()=>qbrExport(w),/one-page limit/)});
test('server audit metadata does not invalidate unchanged reviewed content',()=>{const w=approve(reviewed());w.outcomeReviews[0].actor='authenticated-user';w.outcomeReviews[0].recordedAt='2026-10-01T00:00:00Z';assert.equal(approvalCurrent(w),true)});
test('changed baseline catalogue invalidates approval even when outcome is unchanged',()=>{
 const w=reviewed(),d=w.deployments[0];
 const baseline=evidence.records.find(e=>e.team===d.team&&e.metric==='agent_acceptance'&&e.period==='prior');
 const observation=evidence.records.find(e=>e.team===d.team&&e.metric==='agent_acceptance'&&e.period==='current');
 Object.assign(d,linkMeasurement(linkMeasurement(d,baseline,'baseline'),observation));
 w.outcomeReviews[0].evidenceSnapshot=reviewFingerprint(d);approve(w);
 assert.equal(approvalCurrent(w,evidence),true);
 const changed={...evidence,records:evidence.records.map(e=>e.id===baseline.id?{...e,datasetVersion:'revised'}:e)};
 assert.equal(approvalCurrent(w,changed),false);assert.throws(()=>qbrExport(w,changed),/approval/);
});
test('owner and review date are exported and changes require approval again',()=>{
 const w=approve(reviewed()),d=w.deployments[0];assert.ok(qbrText(w).includes(`Owner: ${d.owner}; review: ${d.due}.`));
 d.owner='New owner';assert.equal(approvalCurrent(w),false);approve(w);d.due='2026-11-01';assert.equal(approvalCurrent(w),false);
});
