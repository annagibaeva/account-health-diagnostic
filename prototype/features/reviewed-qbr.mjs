import {reviewFingerprint} from './outcome-review.mjs';
import {measurementMatches,evidenceCurrent} from './evidence.mjs';
import {pdfLines,onePagePdf} from './qbr-pdf.mjs';
const currentReviews=w=>(w.deployments??[]).flatMap(d=>{const r=w.outcomeReviews?.find(x=>x.deploymentId===d.id);return r&&r.evidenceSnapshot===reviewFingerprint(d)?[{d,r}]:[]});
export function qbrSource(w){return JSON.stringify({goal:w.successPlan?.customerGoal,criteria:w.successPlan?.successCriteria,objectives:(w.successPlan?.objectives??[]).map(o=>o.title),deployments:(w.deployments??[]).map(d=>[d.team,d.title,d.owner,d.due,reviewFingerprint(d)]),reviews:(w.outcomeReviews??[]).map(({actor,recordedAt,...review})=>review)})}
export function validateQbr(w,narrative='',catalog=null){
 const errors=[];
 // Matching an arbitrary prose number to a measurement does not verify its meaning.
 // Quantitative claims must come from structured observations instead.
 if(/\d|%|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|double[ds]?|triple[ds]?|half|percent)\b/i.test(narrative))errors.push('Put quantitative claims in structured measurements, not the narrative. Numeric narrative claims cannot be verified.');
 const publicText=[w.successPlan?.customerGoal,...(w.successPlan?.objectives??[]).map(o=>o.title),narrative,...currentReviews(w).map(({d})=>d.metric)].join(' ');
 if(/\b(caused?|causal|because of|due to|resulted in|led to|saved|savings|roi|return on investment|productivity gains?|increased productivity|improved productivity|faster delivery|hours? saved|reduced costs?)\b/i.test(publicText))errors.push('Remove causal, productivity or financial-benefit claims. These observations do not establish causation.');
 for(const {d,r} of currentReviews(w)){
  for(const [key,label] of [['baselineEvidence','baseline'],['outcomeEvidence','outcome']])if(catalog&&d[key]&&!evidenceCurrent(d[key],catalog))errors.push(`${d.id}: ${label} telemetry changed; refresh evidence and review before export.`);
  if(!['Collect evidence','Expand','Revise','Stop'].includes(r.decision))errors.push(`${d.id}: invalid review decision.`);
  for(const [key,kind] of [['baselineEvidence','baseline'],['outcomeEvidence','outcome']])if(d[key]&&!measurementMatches(d,d[key],kind))errors.push(`${d.id}: ${kind} does not match its evidence reference.`);
  if(d.actual!==null&&d.actual!==undefined&&(!Number.isFinite(d.actual)||!d.observed||!d.evidence?.trim()))errors.push(`${d.id}: observed results need finite values, a date and evidence.`);
  if(!Number.isFinite(d.baseline)||!Number.isFinite(d.target))errors.push(`${d.id}: baseline and target must be finite numbers.`);
 }
 return [...new Set(errors)];
}
export function qbrText(w,narrative=''){
 const lines=['ACCOUNT OUTCOME REVIEW','Example customer | Synthetic evidence','', 'CUSTOMER GOAL (stated intent)',w.successPlan?.customerGoal||'Customer goal not recorded.'];
 const objectives=w.successPlan?.objectives??[];if(objectives.length)lines.push('Objectives: '+objectives.map(o=>o.title).join('; '));
 lines.push('','REVIEWED OBSERVATIONS');const refs=[];let counter=0;
 for(const {d,r} of currentReviews(w)){
  const ref=`E${++counter}`;lines.push(`${d.team}: ${d.metric} [${ref}]`, `Baseline ${d.baseline}; target ${d.target}; observed ${d.actual??'unavailable'} ${d.unit}. Quality: ${d.quality}. Review decision: ${r.decision}.`, `Owner: ${d.owner||'Unassigned'}; review: ${d.due||'Not scheduled'}.`);
  const evidence=d.outcomeEvidence;
  refs.push(evidence?`[${ref}] ${evidence.id}; ${evidence.datasetVersion}; ${evidence.window.start} to ${evidence.window.end}; ${evidence.numerator}/${evidence.denominator}.`: `[${ref}] ${d.id}; manual, not independently verified; ${d.observed||'no observation date'}.`);
  if(d.baselineEvidence){const b=d.baselineEvidence;refs.push(`[${ref} baseline] ${b.id}; ${b.datasetVersion}; ${b.numerator}/${b.denominator}.`)}
 }
 if(!refs.length)lines.push('No current reviewed outcomes available.');
 lines.push('','DECISIONS AND NEXT STEPS',narrative||'Collect comparable follow-up evidence before changing rollout.');
 if(refs.length)lines.push('','EVIDENCE REFERENCES',...refs);
 lines.push('','LIMITATIONS','Synthetic, observational evidence; no causal productivity, quality or financial benefit is established. Manual observations are labeled. Private notes and reproduction details are excluded.');return lines.join('\n');
}
export function approvalCurrent(w,catalog=null){const q=w.reviewedQbr;return !!q?.approval&&q.approval.source===qbrSource(w)&&q.approval.narrative===q.narrative&&validateQbr(w,q.narrative,catalog).length===0}
export function qbrExport(w,catalog=null){if(!approvalCurrent(w,catalog))throw Error('Current human approval is required.');return onePagePdf(qbrText(w,w.reviewedQbr.narrative)+`\n\nReviewed by ${w.reviewedQbr.approval.reviewer} | ${w.reviewedQbr.approval.at}`)}
export function mountReviewedQbr(ctx){
 const {node,button}=ctx,section=node('section','');section.dataset.screen='qbr';section.hidden=true;document.querySelector('main').append(section);const nav=node('button','Reviewed QBR','navbutton');nav.dataset.page='qbr';document.querySelector('nav').append(nav);
 const head=node('div','','heading');head.append(node('h1','Review before sharing.'));
 const notice=node('p','Structured observations carry evidence references. Numeric narrative and causal-benefit claims are blocked by conservative rules; other prose still requires human review. Manual evidence is labeled. Export rejects overflow rather than dropping content.','internal-banner');
 const narrativeLabel=node('label','Customer-facing decisions / next steps'),narrative=document.createElement('textarea');narrative.maxLength=700;narrativeLabel.append(narrative);
 const reviewerLabel=node('label','Reviewer'),reviewer=document.createElement('input');reviewer.maxLength=100;reviewerLabel.append(reviewer);
 const confirmation=node('label',''),check=document.createElement('input');check.type='checkbox';confirmation.append(check,document.createTextNode(' I reviewed the claims, source evidence and customer-facing content.'));
 const status=node('p','','small');status.setAttribute('role','status');const validation=node('p','','internal-banner');validation.setAttribute('role','alert');const preview=node('pre','','qbr-preview');let loaded=false;
 const approve=button('Approve current brief',()=>{const w=ctx.getWorkspace(),errors=validateQbr(w,narrative.value,ctx.getEvidence?.());if(errors.length){status.textContent=errors.join(' ');return}if(!check.checked||!reviewer.value.trim()){status.textContent='Enter a reviewer and confirm the content review.';return}if(!w.successPlan?.customerGoal?.trim()){status.textContent='Record a customer goal first.';return}try{pdfLines(qbrText(w,narrative.value)+`\n\nReviewed by ${reviewer.value.trim()} | ${new Date().toISOString()}`)}catch(e){status.textContent=e.message;return}w.reviewedQbr={narrative:narrative.value,approval:{reviewer:reviewer.value.trim(),at:new Date().toISOString(),source:qbrSource(w),narrative:narrative.value}};ctx.saveWorkspace()});
 const download=button('Download reviewed PDF',()=>{try{const bytes=qbrExport(ctx.getWorkspace(),ctx.getEvidence?.()),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download='reviewed-qbr.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){status.textContent=e.message}});
 narrative.oninput=()=>{const w=ctx.getWorkspace();w.reviewedQbr??={};w.reviewedQbr.narrative=narrative.value;w.reviewedQbr.approval=null;check.checked=false;ctx.saveWorkspace()};
 section.append(head,notice,narrativeLabel,reviewerLabel,confirmation,approve,download,status,validation,preview);
 function render(){const w=ctx.getWorkspace();if(!loaded){narrative.value=w.reviewedQbr?.narrative??'';loaded=true}const current=approvalCurrent(w,ctx.getEvidence?.()),errors=validateQbr(w,narrative.value,ctx.getEvidence?.());try{pdfLines(qbrText(w,narrative.value)+'\n\nReviewed by '+(reviewer.value||'Reviewer')+' | '+new Date().toISOString())}catch(e){errors.push(e.message)}download.disabled=!current||errors.length>0;approve.disabled=errors.length>0;validation.textContent=errors.length?errors.join(' '):'Structured checks passed. Human review is still required.';status.textContent=current?'Reviewed by '+w.reviewedQbr.approval.reviewer:'Draft / review required. Source or narrative changes invalidate approval.';preview.textContent=qbrText(w,narrative.value);if(!current)check.checked=false}return {render};
}
