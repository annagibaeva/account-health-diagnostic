export const readinessChecks={repositoryAccess:'Repository access',environment:'Environment setup',permittedWorkflow:'Permitted workflow',champion:'Customer champion',reviewerCapacity:'Reviewer capacity'};
export function validateReadiness(value){
 if(value==null)return [];
 if(typeof value!=='object'||Array.isArray(value))return ['Readiness must contain named checks.'];
 const errors=[];for(const key of Object.keys(readinessChecks)){const check=value[key];if(!check||!['Unknown','Ready','Blocked'].includes(check.status))errors.push(`${readinessChecks[key]} needs a valid status.`);if(typeof check?.evidence!=='string'||check.evidence.length>2000)errors.push(`${readinessChecks[key]} needs evidence text of at most 2,000 characters.`);else if(check.status!=='Unknown'&&!check.evidence.trim())errors.push(`${readinessChecks[key]} requires evidence for its status.`)}return errors;
}
export function readinessSummary(deployment){
 if(!deployment.readiness)return {configured:false,ready:0,unknown:5,blocked:0,status:'Not assessed',canDeploy:false};
 const checks=Object.keys(readinessChecks).map(k=>deployment.readiness[k]);const ready=checks.filter(c=>c?.status==='Ready'&&c.evidence?.trim()).length,blocked=checks.filter(c=>c?.status==='Blocked').length;
 return {configured:true,ready,blocked,unknown:5-ready-blocked,status:blocked?'Blocked':ready===5?'Ready':'Needs assessment',canDeploy:ready===5&&validateReadiness(deployment.readiness).length===0};
}
export function canDeploy(deployment){return readinessSummary(deployment).canDeploy}
export function validateWorkflowOutcome(value){
 if(value==null)return [];if(typeof value!=='object'||Array.isArray(value))return ['Workflow outcome must be an object.'];
 const errors=[];if(!['IDE assistance','Delegated agent'].includes(value.mode))errors.push('Choose a workflow mode.');
 for(const key of ['attemptedTasks','acceptedTasks','reviewedTasks','reworkTasks'])if(value[key]!=null&&(!Number.isSafeInteger(value[key])||value[key]<0))errors.push(`${key} must be a non-negative whole count.`);
 if(value.cost!=null&&(!Number.isFinite(value.cost)||value.cost<0))errors.push('Cost must be a non-negative number.');
 for(const key of ['acceptedTasks','reviewedTasks','reworkTasks'])if(value[key]!=null&&(value.attemptedTasks==null||value[key]>value.attemptedTasks))errors.push(`${key} requires an attempted-task denominator at least as large.`);
 if(value.reworkTasks!=null&&(value.reviewedTasks==null||value.reworkTasks>value.reviewedTasks))errors.push('Rework tasks require a reviewed-task denominator at least as large.');
 for(const key of ['windowStart','windowEnd','evidence','currency'])if(typeof value[key]!=='string'||value[key].length>2000)errors.push(`${key} must be text of at most 2,000 characters.`);
 const measured=['attemptedTasks','acceptedTasks','reviewedTasks','reworkTasks','cost'].some(k=>value[k]!=null);
 const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(measured&&(!date(value.windowStart)||!date(value.windowEnd)||value.windowStart>value.windowEnd||!value.evidence?.trim()))errors.push('Measurements require a valid observation window and evidence.');
 if(value.cost!=null&&!/^[A-Z]{3}$/.test(value.currency??''))errors.push('Measured cost requires a three-letter currency code.');
 return errors;
}
export function saveDeploymentReadiness(deployment,readiness,workflowOutcome){const errors=[...validateReadiness(readiness),...validateWorkflowOutcome(workflowOutcome)];if(errors.length)throw Error(errors.join(' '));return {...deployment,readiness:structuredClone(readiness),workflowOutcome:structuredClone(workflowOutcome)}}
export function renderDeploymentReadiness({deployment,onSave}){
 const make=(tag,text)=>{const el=document.createElement(tag);el.textContent=text??'';return el};
 const section=make('section');section.className='editor';const summary=readinessSummary(deployment);section.append(make('h2','Deployment readiness'),make('p',`${summary.status} · ${summary.ready}/5 checks ready. Unknown checks require assessment before deployment or expansion.`));
 const form=make('form'),grid=make('div');grid.className='form-grid';const controls={};
 for(const [key,title]of Object.entries(readinessChecks)){const box=make('div'),label=make('label',title),select=make('select');for(const status of ['Unknown','Ready','Blocked']){const option=make('option',status);select.append(option)}select.value=deployment.readiness?.[key]?.status??'Unknown';label.append(select);const evidenceLabel=make('label',title+' evidence'),evidence=make('textarea');evidence.maxLength=2000;evidence.rows=2;evidence.value=deployment.readiness?.[key]?.evidence??'';evidenceLabel.append(evidence);box.append(label,evidenceLabel);grid.append(box);controls[key]={select,evidence}}
 const outcome=deployment.workflowOutcome??{},outcomeGrid=make('div');outcomeGrid.className='form-grid';const modeLabel=make('label','Workflow mode'),mode=make('select');for(const value of ['IDE assistance','Delegated agent'])mode.append(make('option',value));mode.value=outcome.mode??'IDE assistance';modeLabel.append(mode);outcomeGrid.append(modeLabel);const hint=make('p');const explain=()=>{hint.textContent=mode.value==='IDE assistance'?'Count human-led tasks where assistance was used; acceptance means the human accepted the completed task.':'Count delegated attempts and tasks accepted after human review; do not treat agent completion as acceptance.'};mode.onchange=explain;explain();const inputs={};
 for(const [key,title,type]of [['attemptedTasks','Tasks attempted','number'],['acceptedTasks','Completed tasks accepted','number'],['reviewedTasks','Tasks reviewed by a human','number'],['reworkTasks','Reviewed tasks requiring rework','number'],['cost','Observed tool cost (optional)','number'],['currency','Currency code','text'],['windowStart','Observation start','date'],['windowEnd','Observation end','date'],['evidence','Outcome evidence','textarea']]){const label=make('label',title),input=make(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=outcome[key]??'';if(type==='number'){input.min='0';input.step=key==='cost'?'any':'1'}input.maxLength=2000;label.append(input);outcomeGrid.append(label);inputs[key]=input}
 const error=make('p');error.setAttribute('role','status');const submit=make('button','Save readiness and workflow observations');submit.type='submit';submit.className='action primary';form.append(grid,make('h3','Workflow-specific observations'),hint,make('p','These counts describe the observed sample. They do not establish productivity gains, and do not replace the intervention’s agreed success metric.'),outcomeGrid,error,submit);section.append(form);
 form.onsubmit=async event=>{event.preventDefault();try{const readiness=Object.fromEntries(Object.entries(controls).map(([key,c])=>[key,{status:c.select.value,evidence:c.evidence.value.trim()}]));const workflowOutcome={mode:mode.value};for(const [key,input]of Object.entries(inputs))workflowOutcome[key]=input.type==='number'?(input.value===''?null:Number(input.value)):input.value.trim();const next=saveDeploymentReadiness(deployment,readiness,workflowOutcome);submit.disabled=true;await onSave(next);error.textContent='Submitted for saving. See shared workspace status for confirmation.'}catch(e){error.textContent=e.message}finally{submit.disabled=false}};
 return section;
}
