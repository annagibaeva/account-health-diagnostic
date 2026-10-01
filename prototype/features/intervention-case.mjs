import {readinessChecks} from './deployment-readiness.mjs';
import {saveHypothesisPlan} from './hypothesis.mjs';
import {reviewFingerprint,canExpand} from './outcome-review.mjs';

export const EXAMPLE_INTERVENTION_ID='DEMO-PAYMENTS-CASE';
export const CUSTOMER_DECISIONS=['Pending','Continue pilot','Expand','Revise','Stop'];
export function customerDecisionFingerprint(d){return JSON.stringify([reviewFingerprint(d),d.action,d.hypothesis,d.hypothesisPlan,d.readiness,d.workflowOutcome,d.owner,d.due]);}
export function customerDecisionCurrent(d){return !!d.customerDecision&&d.customerDecision.evidenceSnapshot===customerDecisionFingerprint(d);}
export function validateCustomerDecision(d,decision){
 const expected=recordCustomerDecision(d,decision).customerDecision;
 if(decision.evidenceSnapshot!==expected.evidenceSnapshot)throw Error('Customer decision is outdated.');
 if(decision.synthetic!==expected.synthetic)throw Error('Customer decision must preserve the example label.');
 return true;
}
export function recordCustomerDecision(d,input){
 const decision=input.decision;
 if(!CUSTOMER_DECISIONS.includes(decision))throw Error('Choose a customer decision.');
 if(decision==='Expand'&&!canExpand(d))throw Error('Expansion requires a reached target and passed quality guardrail with comparable dated evidence.');
 for(const key of ['owner','date','source','rationale'])if(typeof input[key]!=='string'||!input[key].trim())throw Error('Decision maker, date, source and rationale are required.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date)||!Number.isFinite(Date.parse(input.date))||new Date(input.date).toISOString().slice(0,10)!==input.date)throw Error('Enter a valid decision date.');
 return {...d,customerDecision:{decision,owner:input.owner.trim(),date:input.date,source:input.source.trim(),rationale:input.rationale.trim(),synthetic:d.synthetic===true,evidenceSnapshot:customerDecisionFingerprint(d)}};
}
export function createExampleIntervention(){
 const d={id:EXAMPLE_INTERVENTION_ID,synthetic:true,recommendationEvidence:[],measurementKind:'manual',title:'Payments context pilot — example',team:'Payments',objective:'Reduce review rework on bounded maintenance tasks',owner:'Deployment manager (example)',partner:'VP of Engineering (example)',status:'Complete',due:'2026-10-29',metric:'Tasks requiring substantial review rework',unit:'%',direction:'decrease',baseline:40,target:25,actual:35,observed:'2026-10-28',quality:'Passed',guardrail:'All pilot changes peer-reviewed; no critical defects in the sample',source:'Synthetic manual pilot register; not API telemetry',evidence:'Illustrative matched task samples: baseline 8/20 tasks required rework (2026-09-30–2026-10-13); follow-up 7/20 (2026-10-15–2026-10-28). Different tasks and a small sample prevent causal attribution.',hypothesis:'Missing repository context may cause avoidable review rework.',action:'Add context instructions, review them with the champion, then run a bounded maintenance pilot.',links:'',caseHistory:[{date:'2026-10-14',stage:'Agree',summary:'Champion agrees to a 20-task pilot and a rework target of 25%.'},{date:'2026-10-15',stage:'Deliver',summary:'Context instructions reviewed and pilot started. No real PR or agent run is claimed.'},{date:'2026-10-28',stage:'Measure',summary:'Rework falls from 40% to 35%; target missed. All tasks reviewed; no critical defects observed.'},{date:'2026-10-29',stage:'Decide',summary:'Customer revises the pilot to test task selection before expansion.'}]};
 d.readiness=Object.fromEntries(Object.entries(readinessChecks).map(([key,label])=>[key,{status:'Ready',evidence:'Synthetic pilot check: '+label+' confirmed for the bounded task sample.'}]));
 d.workflowOutcome={mode:'IDE assistance',attemptedTasks:20,acceptedTasks:20,reviewedTasks:20,reworkTasks:7,cost:null,currency:'',windowStart:'2026-10-15',windowEnd:'2026-10-28',evidence:'Synthetic pilot register: all 20 tasks eventually accepted after review; 7 required substantial rework.'};
 Object.assign(d,saveHypothesisPlan(d,{observation:'Synthetic baseline: 8 of 20 maintenance tasks needed substantial review rework.',hypothesis:d.hypothesis,alternatives:'Task complexity may differ. Reviewer expectations or familiarity may explain rework.',test:d.action,successCriteria:'At most 5 of 20 tasks require substantial rework; all changes receive peer review.',falsificationCriteria:'If rework remains above 25%, context alone is not sufficient; test task selection next.',decision:'accept',rationale:'Agreed to test the explanation in a bounded synthetic pilot; not proof of a cause.'},'2026-10-14T09:00:00.000Z'));
 return recordCustomerDecision(d,{decision:'Revise',owner:'VP of Engineering (example)',date:'2026-10-29',source:'Synthetic pilot review — example only',rationale:'Target missed. Test narrower task selection with another 20 tasks; keep peer-review guardrails. Observed change does not establish causation.'});
}
export function loadExampleIntervention(workspace){
 if(workspace.deployments.some(d=>d.id===EXAMPLE_INTERVENTION_ID))return false;
 const d=createExampleIntervention();workspace.deployments.push(d);workspace.outcomeReviews??=[];
 workspace.successPlan??={};workspace.successPlan.objectives??=[];
 if(!workspace.successPlan.objectives.some(o=>o.id==='DEMO-PAYMENTS-OBJECTIVE'))workspace.successPlan.objectives.push({id:'DEMO-PAYMENTS-OBJECTIVE',title:'Example: reduce maintenance review rework',owner:'VP of Engineering (example)',targetDate:d.due,deploymentIds:[d.id],synthetic:true});
 workspace.outcomeReviews.push({deploymentId:d.id,decision:'Revise',reviewer:'Deployment manager (example)',notes:'Synthetic case: target missed; investigate task mix before expanding.',reviewedAt:'2026-10-29T09:00:00.000Z',evidenceSnapshot:reviewFingerprint(d)});
 return true;
}
export function renderInterventionCase(ctx,d){
 const {node,field}=ctx, panel=node('section','','record');panel.append(node('h3','Customer decision'));
 if(d.synthetic)panel.append(node('p','Synthetic example · no real customer approval','badge'));
 if(d.caseHistory?.length){const history=node('details','');history.append(node('summary','Intervention history'));for(const event of d.caseHistory)history.append(node('p',`${event.date} · ${event.stage}: ${event.summary}`));panel.append(history);}
 const r=d.customerDecision;panel.append(node('p',r?(customerDecisionCurrent(d)?`${r.decision} · ${r.owner} · ${r.date}`:'Decision needs review — intervention changed'):'No customer decision recorded','small'));
 const form=node('form',''),fields=node('div','','form-grid'),prefix=`customer-${d.id}-`;
 const decision=field(fields,prefix,'decision','Decision',r?.decision??'Pending',{options:CUSTOMER_DECISIONS});
 const owner=field(fields,prefix,'owner','Decision maker',r?.owner??'');
 const date=field(fields,prefix,'date','Decision date',r?.date??'',{type:'date'});
 const source=field(fields,prefix,'source','Conversation / record reference',r?.source??'');
 const rationale=field(fields,prefix,'rationale','Rationale and next commitment',r?.rationale??'',{type:'textarea'});
 const error=node('p','','small');error.setAttribute('role','alert');const save=node('button','Save customer decision','action');save.type='submit';form.append(fields,error,save);
 form.onsubmit=e=>{e.preventDefault();try{const w=ctx.getWorkspace(),i=w.deployments.findIndex(x=>x.id===d.id);if(i<0)throw Error('Intervention no longer exists.');w.deployments[i]=recordCustomerDecision(w.deployments[i],{decision:decision.value,owner:owner.value,date:date.value,source:source.value,rationale:rationale.value});ctx.saveWorkspace();}catch(err){error.textContent=err.message;}};
 panel.append(form);return panel;
}

