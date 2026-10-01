import {reviewFingerprint} from './outcome-review.mjs';
import {evidenceLabel,measurementKind} from './evidence.mjs';
export function interventionRecord(workspace,id){
 const deployment=workspace.deployments.find(d=>d.id===id);
 if(!deployment)return null;
 return {deployment,review:workspace.outcomeReviews?.find(r=>r.deploymentId===id),issues:(workspace.reproductionPackets??[]).filter(r=>r.deploymentId===id),feedback:(workspace.feedback??[]).filter(r=>r.deployment===id)};
}
export function mountInterventionWorkspace(ctx){
 const {node,button}=ctx,section=node('section','');section.dataset.screen='intervention';section.hidden=true;document.querySelector('main').append(section);
 let selected=null,tab='overview';const tabs=['overview','work','evidence','review'];
 function value(parent,label,text){parent.append(node('div',label,'eyebrow'),node('p',String(text??'Not recorded')))}
 function render(){
  section.replaceChildren();const record=interventionRecord(ctx.getWorkspace(),selected);
  if(!record){section.append(node('h1','Intervention'),node('p','Choose an intervention from Deployment plans or Customer outcomes.'));return}
  const {deployment:d,review:r,issues,feedback}=record,heading=node('div','','heading'),title=node('div','');title.append(node('div',d.id+' · '+d.team,'eyebrow'),node('h1',d.title));heading.append(title,node('span',d.status,'badge'));section.append(button('← Deployment plans',()=>ctx.navigate('deployments')),heading);
  const nav=node('div','','form-buttons');nav.setAttribute('aria-label','Intervention sections');for(const key of tabs){const b=button(key[0].toUpperCase()+key.slice(1),()=>{tab=key;render()});b.setAttribute('aria-pressed',String(key===tab));nav.append(b)}section.append(nav);
  const body=node('article','','record');section.append(body);
  if(tab==='overview'){
   value(body,'Customer objective',d.objective);value(body,'Owner / customer partner',d.owner+' / '+d.partner);value(body,'Review date',d.due);value(body,'Hypothesis',d.hypothesis||'Not recorded');value(body,'Success criterion',`${d.metric}: ${d.baseline} → ${d.target} ${d.unit} (${d.direction})`);value(body,'Quality guardrail',d.guardrail);body.append(button('Edit intervention',()=>{ctx.navigate('deployments');ctx.openDeployment(d.id)}));ctx.renderInterventionOverview?.(body,d);
  }else if(tab==='work'){
   value(body,d.status==='Complete'?'Work performed / recorded action':'Next action',d.action);body.append(ctx.recordLinks(d));value(body,'Linked technical issues',issues.map(i=>i.id+' · '+i.title).join('\n')||'None');if(issues.length)body.append(button('Open technical issues',()=>ctx.navigate('packets')));value(body,'Linked feedback',feedback.map(i=>i.id+' · '+i.title).join('\n')||'None');body.append(button('Capture feedback',()=>{ctx.navigate('feedback');ctx.openFeedback(null,d.id)}));ctx.renderInterventionWork?.(body,d);
  }else if(tab==='evidence'){
   value(body,'Baseline',d.baselineEvidence?evidenceLabel(d.baselineEvidence):`${d.baseline} ${d.unit} · manual measurement`);value(body,'Follow-up',d.outcomeEvidence?evidenceLabel(d.outcomeEvidence):`${d.actual??'Not measured'} ${d.unit} · ${d.observed||'No observation date'} · manual measurement`);value(body,'Observed result',`${d.actual??'Not measured'} ${d.unit} · ${d.observed||'No observation date'}`);value(body,'Assessment',ctx.outcome(d));value(body,'Quality',d.quality);value(body,'Measurement method',d.evidence||d.source);const detail=node('details','');detail.append(node('summary','Diagnostic references'),node('p',(d.recommendationEvidence??[]).map(evidenceLabel).join('\n')||'No linked telemetry'));body.append(detail,node('p',measurementKind(d)+' measurement; observational, not causal.','small'),button('Update measurement',()=>{ctx.navigate('deployments');ctx.openDeployment(d.id)}));
  }else{
   value(body,'Outcome decision',r?.decision||'Not reviewed');value(body,'Review status',!r?'Not reviewed':r.evidenceSnapshot===reviewFingerprint(d)?'Matches recorded measurements':'Outdated — measurements changed');value(body,'Reviewer',r?.reviewer);value(body,'Rationale',r?.notes);body.append(button('Record outcome review',()=>ctx.openOutcomeReview?ctx.openOutcomeReview(d.id):ctx.navigate('outcomes')));ctx.renderInterventionReview?.(body,d);
  }
 }
 return {render,open(id,next='overview'){selected=id;tab=tabs.includes(next)?next:'overview';ctx.navigate('intervention');render()}};
}
