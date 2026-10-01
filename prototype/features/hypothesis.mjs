// A proposed explanation is not an observed result. Disposition concerns the test.
const fields=['observation','hypothesis','alternatives','test','successCriteria','falsificationCriteria','rationale'];
export function hypothesisPlanFor(d){
 const records=d.recommendationEvidence??[];
 const observations=records.filter(e=>e.period==='current'&&e.value!==null).map(e=>`${e.metric}: ${e.numerator}/${e.denominator} (${e.value}${e.unit??''}); ${e.window?.start}–${e.window?.end}; ${e.id}`).join('\n');
 const tracking=d.kind==='measurement_repair';
 const defaults={
  observation:observations||d.why||'No versioned observation linked. Record the signal and its source before choosing a test.',
  hypothesis:d.hypothesis||(tracking?'Tracking configuration or identity mapping may explain missing attribution.':'Task fit or repository context may help explain the observed adoption pattern.'),
  alternatives:tracking?'Repositories may be outside the tracked sample.\nThere may be no eligible commits in the window.\nIdentity matching or ingestion may be incomplete.':'The task mix or team membership may have changed.\nPolicy or review expectations may have changed.\nInstrumentation or sample coverage may differ across windows.',
  test:d.action||'Agree a bounded task sample with the team lead; record task mix, context configuration and review findings before and after the proposed change.',
  successCriteria:d.success_criterion||'Agree the metric, eligible sample, target and review-quality guardrail before starting. Compare non-overlapping windows.',
  falsificationCriteria:tracking?'If the agreed tracked sample reconciles without configuration changes, investigate coverage and identity assumptions instead.':'If comparable evidence does not meet the agreed target, or review quality worsens, revise or stop this intervention. Insufficient evidence means defer judgment.',
  decision:'defer',rationale:'',reviewedAt:null
 };
 return {...defaults,...d.hypothesisPlan};
}
export function validateHypothesisPlan(plan){
 const errors=[];if(!plan||typeof plan!=='object')return ['A hypothesis plan is required.'];
 for(const key of fields){if(typeof plan[key]!=='string')errors.push(`${key} must be text.`);else if(plan[key].length>4000)errors.push(`${key} must be 4,000 characters or fewer.`)}
 if(!['accept','reject','defer'].includes(plan.decision))errors.push('Choose accept, reject or defer.');
 if(plan.decision!=='defer')for(const key of fields)if(typeof plan[key]==='string'&&!plan[key].trim())errors.push(`Complete ${key} before accepting or rejecting the proposed test.`);
 return errors;
}
export function saveHypothesisPlan(deployment,input,now=new Date().toISOString()){
 const plan=Object.fromEntries(fields.map(k=>[k,typeof input[k]==='string'?input[k].trim():input[k]]));plan.decision=input.decision;
 const errors=validateHypothesisPlan(plan);if(errors.length)throw Error(errors.join(' '));
 plan.reviewedAt=now;
 return {...deployment,hypothesis:plan.hypothesis,hypothesisPlan:plan};
}
export function renderHypothesisPlan({deployment,onSave}){
 const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el};
 const section=make('section');section.className='editor';section.append(make('h2','Explanation to test'),make('p','Accept means proceed with this test. Reject means decline the proposal. Neither decision establishes a cause or a productivity gain.'));
 const plan=hypothesisPlanFor(deployment),form=make('form'),grid=make('div');grid.className='form-grid';
 const names={observation:'Observed signal and evidence',hypothesis:'Proposed explanation',alternatives:'Alternative explanations',test:'Test or intervention',successCriteria:'Success criteria',falsificationCriteria:'What would weaken this explanation?',rationale:'Decision rationale'};
 const inputs={};for(const key of fields){const label=make('label',names[key]),input=make('textarea');input.value=plan[key]??'';input.maxLength=4000;input.rows=3;input.name=key;label.append(input);grid.append(label);inputs[key]=input}
 const label=make('label','Disposition of the proposed test'),decision=make('select');decision.name='decision';for(const [value,text]of [['defer','Defer — gather evidence'],['accept','Accept — proceed with test'],['reject','Reject — decline proposal']]){const option=make('option',text);option.value=value;decision.append(option)}decision.value=plan.decision;label.append(decision);grid.append(label);
 const error=make('p');error.setAttribute('role','status');const submit=make('button','Save hypothesis and decision');submit.type='submit';submit.className='action primary';form.append(grid,error,submit);section.append(form);
 form.onsubmit=async event=>{event.preventDefault();error.textContent='';try{const input=Object.fromEntries(fields.map(k=>[k,inputs[k].value]));input.decision=decision.value;const next=saveHypothesisPlan(deployment,input);submit.disabled=true;await onSave(next);error.textContent='Hypothesis submitted for saving. See shared workspace status for confirmation.'}catch(e){error.textContent=e.message}finally{submit.disabled=false}};
 return section;
}
