import {mountOperations} from './features/operations.mjs';
import {sharedWorkspaceClient} from './shared-workspace.mjs';
import {evidence as evidenceCatalog} from './evidence-data.mjs';
import {evidenceLabel,validEvidence,linkMeasurement,reconcileEvidence,recommendationEvidence,measurementKind} from './features/evidence.mjs';
import { teams, actions, branches, diagnose, account, initialWorkspace, outcome, successMetrics } from './diagnostic.mjs';
import {mountSuccessPlan} from './features/success-plan.mjs';
import {mountActionInbox} from './features/action-inbox.mjs';
import {mountReproductionPacket} from './features/reproduction-packet.mjs';
import {mountOutcomeReview} from './features/outcome-review.mjs';
import {mountReviewedQbr} from './features/reviewed-qbr.mjs';
const $=id=>document.getElementById(id);
const key='signal-prototype-v1';
let selected=1,page='overview',scenario='normal',theme='dark',edits={};
try {const saved=JSON.parse(localStorage.getItem(key));if(saved){if(saved.theme==='light')theme='light';if(saved.edits&&typeof saved.edits==='object')for(const [k,v] of Object.entries(saved.edits))if(/^[0-5]$/.test(k)&&typeof v==='string')edits[k]=v.slice(0,500)}}catch{}
function persist(){try{localStorage.setItem(key,JSON.stringify({theme}))}catch{}if(workspace&&sharedClient){workspace.actionOverrides={...edits};saveInternal();$('save-status').textContent='Action submitted to shared workspace'}}
function actionFor(i){return edits[i]??(i===3?'Review permitted workflows with the team lead before considering expansion.':actions[diagnose(teams[i]).action])}
function node(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n}
function navigate(p){page=p==='report'?'qbr':p;const group=document.querySelector(`nav [data-page="${page}"]`)?.closest('details');if(group)group.open=true;render();document.querySelector('main').scrollIntoView({block:'start'})}
function render(){
  document.documentElement.style.colorScheme=theme;$('theme').textContent='Switch to '+(theme==='dark'?'light':'dark');
  document.querySelectorAll('[data-screen]').forEach(n=>n.hidden=n.dataset.screen!==page);document.querySelectorAll('[data-page]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.page===page)));
  $('teams').replaceChildren();teams.forEach((t,i)=>{const d=diagnose(t),b=node('button','','team');b.setAttribute('aria-pressed',String(i===selected));const label=node('span',t.name);label.append(node('small',`${t.size} engineers · ${d.stalled?'Stalled':d.contribution===null?'Tracking gap':d.status}`));b.append(label,node('span',Math.round(d.score),'grade'));b.onclick=()=>{selected=i;render()};$('teams').append(b)});
  const t=teams[selected],base=diagnose(t);$('team-name').textContent=t.name;$('team-status').textContent=base.stalled?'STALLED':base.contribution===null?'TRACKING GAP':base.status.toUpperCase();$('accept').textContent=t.a+'%';$('contribution').textContent=t.c===null?'Unavailable':t.c+'%';$('prior').textContent=t.p+'%';$('current').textContent=t.a+'%';$('prior-bar').style.width=t.p+'%';$('current-bar').style.width=t.a+'%';$('intervention').value=actionFor(selected);$('owner').textContent='Owner · '+t.name+' lead';$('save-status').textContent=Object.hasOwn(edits,selected)?'Custom action · shared workspace':'Suggested action · editable';
  $('team-select').value=selected;$('scenario').value=scenario;const d=diagnose(t,scenario),a=account(selected,scenario);
  const measured=(metric,period='current')=>evidenceCatalog.records.find(r=>r.team===t.name&&r.metric===metric&&r.period===period);
  const acceptance=measured('agent_acceptance'),activity=measured('active_share'),attribution=measured('ai_commit_share'),previous=measured('agent_acceptance','prior');
  const steps=[
    ['D1 / Current evidence gate',d.valid?`PASS · ${acceptance.denominator} suggested diffs; ${activity.denominator/t.size} working days; ${acceptance.completeness*100}% response completeness.`:'FAIL · Current evidence unavailable or demonstration scenario selected. Withhold score and trends.'],
    ['D2 / Adoption health',d.score===null?'Score withheld. Missing responses are not zero activity.':`0.70 × ${t.a}% + 0.30 × ${t.u}% = ${d.score.toFixed(1)} → ${d.status}.`],
    ['D3–D5 / Baseline and independent flags',d.comparable?`Change ${d.delta>0?'+':''}${d.delta} points. Stalled: ${d.stalled?'yes':'no'}; declining: ${d.declining?'yes':'no'}.`:'Comparable windows unavailable → stalled and declining flags unknown.'],
    ['D6 / Contribution check',d.contribution===null?'Unavailable → repair tracking. A valid adoption score remains visible.':`${d.contribution}% of tracked added lines. Coverage of all repositories is unknown; no score weight.`],
    ['D7 / Account roll-up',`${a.headcount}/400 engineers eligible. ${a.score===null?'Below 80% → account score withheld.':'80% gate passes → account score '+a.score.toFixed(1)+'.'}`],
    ['D8 / CTO narrative', 'Traceable numbers → claim validation → human review → export. Failed validation uses a deterministic fallback. Narrative validation is planned, not implemented here.']
  ];$('trace').replaceChildren();steps.forEach(([title,text])=>{const n=node('div',title,'step');n.append(node('small',text));$('trace').append(n)});
  $('branches').replaceChildren();branches.forEach((text,i)=>{const li=node('li',text,i===d.action?'taken':'');if(i===d.action)li.append(node('span','TAKEN','branch-tag'));$('branches').append(li)});$('outcome').textContent=actions[d.action]+(selected===3?' Human context: clarify permitted workflows first.':'');
  $('inputs').textContent=`SQL over reproducible synthetic API-shaped responses\nDataset: ${evidenceCatalog.datasetVersion}\nCurrent: ${acceptance.window.start} to ${acceptance.window.end}\nPrevious: ${previous.window.start} to ${previous.window.end}\nAccepted / suggested diffs: ${acceptance.numerator} / ${acceptance.denominator}\nActive-user-days: ${activity.numerator} / ${activity.denominator}\nEligible working days: ${activity.denominator/t.size}\nAnalytics completeness: ${acceptance.completeness*100}%\nPrior sample: ${previous.denominator} suggested diffs\nAI / total tracked added lines: ${attribution.value===null?'unavailable':attribution.numerator+' / '+attribution.denominator}\nEvidence: ${acceptance.id}\nScenario override: ${scenario}\nRule gates: ≥100 diffs; ≥10 days; ≥90% responses.\nStalled: acceptance <55% and change ≤+2 points.\nDeclining: change ≤−10 points.`;
  $('report-actions').replaceChildren();teams.forEach((t,i)=>$('report-actions').append(node('li',`${t.name} lead — ${actionFor(i)}`)));
  renderInternal();
  renderWorkflowFeatures();
}
teams.forEach((t,i)=>{const o=node('option',t.name);o.value=i;$('team-select').append(o)});
initializeInternal();
var sharedClient=sharedWorkspaceClient({status:message=>{
  internalMessage=message;
  if($('internal-save'))$('internal-save').textContent=message;
  if($('shared-persistence-message'))$('shared-persistence-message').textContent=message;
  if($('shared-persistence-status'))$('shared-persistence-status').hidden=/^(Shared workspace ·|Saved to shared workspace ·|Saving shared workspace)/.test(message);
}});
try {
  workspace=await sharedClient.load();
  for(const d of workspace.deployments){d.recommendationEvidence??=recommendationEvidence(d,evidenceCatalog);d.measurementKind??=measurementKind(d)}
  edits=workspace.actionOverrides??{};
} catch(error) {
  internalMessage=error.message;
  edits={};
}
const sharedNotice=node('div','','internal-banner');
sharedNotice.hidden=/^(Shared workspace ·|Saved to shared workspace ·)/.test(internalMessage);
sharedNotice.id='shared-persistence-status';
const sharedMessage=node('p',internalMessage);sharedMessage.id='shared-persistence-message';sharedMessage.setAttribute('role','status');sharedNotice.append(sharedMessage);
document.querySelector('main').prepend(sharedNotice);
try {
  const legacy=localStorage.getItem('signal-internal-mvp');
  if(legacy){
    const legacyNotice=node('details','','legacy-records');legacyNotice.append(node('summary','Previous browser records'));
    document.querySelector('.sidebar-bottom').append(legacyNotice);
    legacyNotice.append(button('Download previous browser records',()=>{
      const url=URL.createObjectURL(new Blob([legacy],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='previous-browser-records.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }));
  }
}catch{}
initializeConnectors();
initializeAgents();
initializeWorkflowFeatures();
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));$('prepare').onclick=()=>navigate('report');$('why').onclick=()=>{scenario='normal';navigate('reasoning')};$('team-select').onchange=e=>{selected=Number(e.target.value);render()};$('scenario').onchange=e=>{scenario=e.target.value;render()};$('intervention').oninput=e=>{edits[selected]=e.target.value;persist()};$('theme').onclick=()=>{theme=theme==='dark'?'light':'dark';persist();render()};$('print').onclick=()=>window.print();$('download').onclick=()=>{const blob=new Blob([$('report').innerText],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='customer-qbr-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};render();

var workspace, editingDeployment, editingFeedback, internalMessage, editingEvidence;
function initializeInternal(){
  workspace=initialWorkspace();editingDeployment=null;editingFeedback=null;internalMessage='Loading shared workspace…';
  // Legacy browser records remain available as an explicit migration backup.

  for(const d of workspace.deployments){if(d.source==='Cursor Analytics + peer-review sample (simulated)')d.source='Usage analytics + peer-review sample (simulated)';}
  for(const d of workspace.deployments){d.recommendationEvidence??=recommendationEvidence(d,evidenceCatalog);d.measurementKind??=measurementKind(d)}
  const nav=document.querySelector('nav');
  [['deployments','Deployment plans'],['success','Customer success'],['feedback','Product feedback']].forEach(([id,label])=>{const b=node('button',label,'navbutton');b.dataset.page=id;nav.append(b)});
  document.querySelector('main').insertAdjacentHTML('beforeend',`
    <section data-screen="deployments" hidden><div class="heading"><div><div class="eyebrow">Internal workspace / deployment</div><h1>Turn signals into progress.</h1><p class="muted">A hypothesis, an owner, and a measurable next step.</p></div><button id="new-deployment" class="action primary">New intervention +</button></div><div class="internal-banner">SIMULATED INTERNAL ACCOUNT · Example customer · Sponsor: CTO · Internal account lead: Maya Tan (fictional)</div><div id="deployment-summary" class="mini-stats"></div><div id="deployment-list" class="record-grid"></div><section id="deployment-editor" class="editor" hidden><h2 id="deployment-editor-title"></h2><form id="deployment-form"><div class="form-grid" id="deployment-fields"></div><div class="form-buttons"><button class="action primary" type="submit">Save intervention</button><button id="cancel-deployment" class="action" type="button">Cancel</button></div></form></section></section>
    <section data-screen="success" hidden><div class="heading"><div><div class="eyebrow">Internal workspace / customer success</div><h1>Track outcomes, not just activity.</h1><p class="muted">Customer objectives, delivery commitments and evidence quality.</p></div><button id="export-internal" class="action">Export internal records ↓</button></div><div id="success-summary" class="mini-stats"></div><div class="internal-banner">Outcome target met requires a measurement, observation date, evidence and a passed quality guardrail. Targets are illustrative proposals, not customer-agreed commitments.</div><div id="objective-list" class="record-grid"></div><div class="internal-banner">Commercial retention / NRR: unavailable. No contract or revenue history connected. Satisfaction / CSAT: unavailable. No survey connected. These measures are not inferred from usage.</div><p class="small">AI tool adoption signals remain in Account health. This view measures execution and objective attainment, not causal productivity or renewal probability.</p></section>
    <section data-screen="feedback" hidden><div class="heading"><div><div class="eyebrow">Internal workspace / voice of the customer</div><h1>Make customer friction actionable.</h1><p class="muted">Capture workflow impact, evidence and an accountable next step.</p></div><button id="new-feedback" class="action primary">Capture feedback +</button></div><label class="filter-label">Queue status<select id="feedback-filter"><option>All</option><option>New</option><option>Needs reproduction</option><option>Triaged</option><option>Shared with product</option><option>Resolved</option></select></label><p class="small">Status changes are local records. “Shared with product” does not send a message or create an external ticket.</p><div id="feedback-list" class="record-grid"></div><section id="feedback-editor" class="editor" hidden><h2 id="feedback-editor-title"></h2><form id="feedback-form"><div class="form-grid" id="feedback-fields"></div><div class="form-buttons"><button class="action primary" type="submit">Save feedback</button><button id="cancel-feedback" class="action" type="button">Cancel</button></div></form></section></section>
    <p id="internal-save" class="small" role="status"></p>`);
  $('new-deployment').onclick=()=>openDeployment();$('cancel-deployment').onclick=()=>{$('deployment-editor').hidden=true;editingDeployment=null};$('deployment-form').onsubmit=saveDeployment;
  $('new-feedback').onclick=()=>openFeedback();$('cancel-feedback').onclick=()=>{$('feedback-editor').hidden=true;editingFeedback=null};$('feedback-form').onsubmit=saveFeedback;$('feedback-filter').onchange=renderInternal;
  $('export-internal').onclick=()=>{const blob=new Blob([JSON.stringify({...workspace,notice:'Fictional internal records; not for customer distribution'},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='signal-internal-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
}
function saveInternal(){sharedClient.save(workspace);renderInternal();renderWorkflowFeatures()}

function validDeployment(d){return d&&['id','title','team','objective','owner','partner','status','due','metric','unit','direction','guardrail','quality','source','observed','evidence','hypothesis','action'].every(k=>typeof d[k]==='string')&&Number.isFinite(d.baseline)&&Number.isFinite(d.target)&&(d.actual===null||Number.isFinite(d.actual))}
function validFeedback(f){return f&&['id','title','team','workflow','impact','evidence','severity','status','owner','deployment'].every(k=>typeof f[k]==='string')}
var workflowFeatures;
function initializeWorkflowFeatures(){
  const ctx={getWorkspace:()=>workspace,saveWorkspace:saveInternal,navigate,openDeployment,openFeedback,node,field,button,outcome,getEvidence:()=>evidenceCatalog};
  workflowFeatures=[mountSuccessPlan(ctx),mountActionInbox(ctx),mountReproductionPacket(ctx),mountOutcomeReview(ctx),mountReviewedQbr(ctx),mountOperations(ctx)];
  const nav=document.querySelector('nav');nav.querySelector('.navlabel').textContent='Workspace';
  nav.querySelector('[data-page="report"]').remove();
  const overview=node('button','Workflow overview','navbutton');overview.dataset.page='workflow';nav.append(overview);
  for(const [label,ids] of [['Account workflow',['workflow','plan','inbox','packets','outcomes','qbr']],['Analysis & operations',['overview','reasoning','deployments','success','feedback','agents','operations']]]){
    const group=node('details','','nav-group');group.open=label==='Account workflow';
    const summary=node('summary',label);group.append(summary);
    const items=node('div','','nav-items');group.append(items);
    for(const id of ids){const b=nav.querySelector(`[data-page="${id}"]`);if(b)items.append(b)}
    nav.append(group);
  }
  const summary=node('section','');summary.dataset.screen='workflow';summary.hidden=true;
  summary.append(node('div','ACCOUNT WORKFLOW','eyebrow'),node('h1','One account. A shared plan.'),node('p','Understand the customer, coordinate the next action and review the evidence before sharing the result.','muted'));
  const stats=node('div','','mini-stats');const cards=node('div','','record-grid');summary.append(stats,cards);document.querySelector('main').append(summary);
  for(const [id,title,description] of [['plan','01 / Account success plan','Customer goals, stakeholders and source context.'],['inbox','02 / Action inbox','Priorities, accountable owners and next steps.'],['packets','03 / Reproduction packet','Turn technical friction into an actionable investigation.'],['outcomes','04 / Outcome review','Compare measurements and decide what happens next.'],['qbr','05 / Reviewed QBR','Share evidence-backed results after human review.']]){
    const card=node('article','','record');card.append(node('h2',title),node('p',description,'muted'),button('Open →',()=>navigate(id)));cards.append(card);
  }
  workflowFeatures.push({render(){stats.replaceChildren();for(const [label,value] of [['Customer goal',workspace.successPlan?.customerGoal||'Not recorded'],['Open interventions',String(workspace.deployments.filter(d=>d.status!=='Complete').length)],['Next account review',workspace.successPlan?.reviewDate||'Not scheduled']]){const item=node('div','');item.append(node('div',label,'eyebrow'),node('p',value));stats.append(item)}}});
  page='workflow';
}
function renderWorkflowFeatures(){for(const feature of workflowFeatures??[])feature.render()}
function button(text,fn){const b=node('button',text,'action');b.type='button';b.onclick=fn;return b}
function labelValue(label,value){const p=node('p','');p.append(node('span',label+' · ','muted'),document.createTextNode(value));return p}
function summary(container,items){container.replaceChildren();items.forEach(([value,label])=>{const box=node('div','','summary-item');box.append(node('div',String(value),'summary-number'),node('div',label,'small'));container.append(box)})}
function renderInternal(){
  if(!workspace)return;const m=successMetrics(workspace.deployments);$('internal-save').hidden=!['deployments','success','feedback'].includes(page);$('internal-save').textContent=internalMessage;
  summary($('deployment-summary'),[[m.total,'Interventions'],[m.complete+'/'+m.total,'Execution complete'],[m.blocked,'Blocked']]);
  summary($('success-summary'),[[m.assessable?Math.round(m.met/m.assessable*100)+'%':'—',`Targets met · ${m.met}/${m.assessable} assessable`],[m.total?Math.round(m.complete/m.total*100)+'%':'—',`Execution complete · ${m.complete}/${m.total}`],[m.pending,'Awaiting outcome evidence']]);
  $('deployment-list').replaceChildren();$('objective-list').replaceChildren();
  workspace.deployments.forEach(d=>{
    const r=node('article','','record');r.append(node('div',d.id+' / '+d.team,'eyebrow'),node('h2',d.title),node('span',d.status,'badge'),node('p',d.objective,'muted'),labelValue('Next action',d.action),labelValue('Owner',d.owner),labelValue('Customer partner',d.partner),labelValue('Due',d.due),labelValue('Result',outcome(d)),labelValue('Diagnostic evidence',(d.recommendationEvidence??[]).map(evidenceLabel).join(' | ')||'No linked telemetry'),labelValue('Measurement type',measurementKind(d)));const controls=node('div','','form-buttons');controls.append(button('Edit / record outcome',()=>openDeployment(d.id)),button('Capture linked feedback',()=>{navigate('feedback');openFeedback(null,d.id)}));r.append(controls);$('deployment-list').append(r);
    const o=node('article','','record');o.append(node('div',d.id+' / '+d.team,'eyebrow'),node('h2',d.objective),labelValue(d.metric,`${d.baseline} → ${d.actual===null?'not measured':d.actual} · target ${d.target} ${d.unit} (${d.direction})`),labelValue('Assessment',outcome(d)),labelValue('Guardrail',d.guardrail+' · '+d.quality),labelValue('Measurement source',d.source),labelValue('Observed',d.observed||'Not recorded'),labelValue('Evidence',d.evidence||'Not recorded'),button('Update result',()=>{navigate('deployments');openDeployment(d.id)}));$('objective-list').append(o);
  });
  $('feedback-list').replaceChildren();const filter=$('feedback-filter').value;const records=workspace.feedback.filter(f=>filter==='All'||f.status===filter);if(!records.length)$('feedback-list').append(node('p','No feedback matches this status.','muted'));records.forEach(f=>{const r=node('article','','record');r.append(node('div',f.id+' / '+f.team,'eyebrow'),node('h2',f.title),node('span',f.severity+' · '+f.status,'badge'),labelValue('Workflow',f.workflow),labelValue('Impact',f.impact),labelValue('Evidence',f.evidence),labelValue('Owner',f.owner),labelValue('Intervention',f.deployment||'Not linked'),button('Triage / update',()=>openFeedback(f.id)));$('feedback-list').append(r)});
}
function field(container,prefix,key,label,value,{options,type='text',optional=false}={}){
  const wrap=node('label',label);const input=options?document.createElement('select'):type==='textarea'?document.createElement('textarea'):document.createElement('input');input.id=prefix+key;input.name=key;if(options)options.forEach(o=>{const opt=node('option',typeof o==='string'?o:o.label);opt.value=typeof o==='string'?o:o.value;input.append(opt)});else if(type!=='textarea')input.type=type;input.required=!optional;if(type==='number'){input.step='any';input.min='0'}else if(!options&&type!=='date')input.maxLength=key==='evidence'?1000:500;input.value=value??'';input.oninput=()=>input.setCustomValidity('');wrap.append(input);container.append(wrap);return input;
}
function openDeployment(id){
  editingDeployment=id??null;const d=workspace.deployments.find(d=>d.id===id)??{title:'',team:teams[selected].name,objective:'',owner:'',partner:'',status:'Planned',due:'2026-10-30',metric:'',unit:'%',direction:'increase',baseline:0,target:0,actual:null,guardrail:'',quality:'Not assessed',source:'',observed:'',evidence:'',hypothesis:'',action:''};$('deployment-editor-title').textContent=id?'Edit intervention / '+id:'New measurable intervention';const c=$('deployment-fields');c.replaceChildren();
  const config=[['title','Title'],['team','Team',{options:teams.map(t=>t.name)}],['objective','Customer objective'],['owner','Internal owner'],['partner','Customer counterpart'],['status','Execution status',{options:['Planned','In progress','Blocked','Complete']}],['due','Review date',{type:'date'}],['hypothesis','Hypothesis',{type:'textarea'}],['action','Action',{type:'textarea'}],['metric','Success metric'],['unit','Unit',{options:['%','tasks','days','hours','count']}],['direction','Target direction',{options:['increase','decrease']}],['baseline','Baseline',{type:'number'}],['target','Target',{type:'number'}],['actual','Observed value (optional)',{type:'number',optional:true}],['observed','Observation date (required with observed value)',{type:'date',optional:true}],['guardrail','Quality guardrail'],['quality','Quality assessment',{options:['Not assessed','Passed','Failed']}],['source','Measurement source'],['evidence','Evidence / measurement method',{type:'textarea'}]];config.forEach(([k,l,opts])=>field(c,'dep-',k,l,d[k],opts));editingEvidence={baselineEvidence:d.baselineEvidence,outcomeEvidence:d.outcomeEvidence,recommendationEvidence:d.recommendationEvidence??recommendationEvidence(d,evidenceCatalog)};mountEvidencePicker(c);$('deployment-editor').hidden=false;$('deployment-editor').scrollIntoView({block:'start'});
}
function saveDeployment(e){e.preventDefault();let data=Object.fromEntries(new FormData(e.target));for(const k of ['baseline','target','actual'])data[k]=data[k]===''?null:Number(data[k]);const obs=$('dep-observed');obs.setCustomValidity(data.actual!==null&&!data.observed?'Record the observation date.':'');if(!obs.reportValidity())return;for(const k of ['baseline','target','actual']){const input=$('dep-'+k);input.setCustomValidity(data.unit==='%'&&data[k]!==null&&data[k]>100?'Percentages must be between 0 and 100.':'');if(!input.reportValidity())return}data={...data,...editingEvidence};data=reconcileEvidence(data);data.recommendationEvidence=recommendationEvidence(data,evidenceCatalog);data.id=editingDeployment??'DEP-'+crypto.randomUUID().slice(0,8);const index=workspace.deployments.findIndex(d=>d.id===data.id);if(index<0)workspace.deployments.push(data);else workspace.deployments[index]={...workspace.deployments[index],...data,baselineEvidence:data.baselineEvidence,outcomeEvidence:data.outcomeEvidence};$('deployment-editor').hidden=true;editingDeployment=null;saveInternal()}
function openFeedback(id,linked){
  editingFeedback=id??null;const f=workspace.feedback.find(f=>f.id===id)??{title:'',team:workspace.deployments.find(d=>d.id===linked)?.team??teams[selected].name,workflow:'',impact:'',evidence:'',severity:'Medium',status:'New',owner:'',deployment:linked??''};$('feedback-editor-title').textContent=id?'Triage feedback / '+id:'Capture product feedback';const c=$('feedback-fields');c.replaceChildren();const config=[['title','Feedback title'],['team','Affected team',{options:teams.map(t=>t.name)}],['workflow','Affected workflow'],['impact','Customer impact',{type:'textarea'}],['evidence','Evidence / reproduction details',{type:'textarea'}],['severity','Severity',{options:['Low','Medium','High']}],['status','Feedback status',{options:['New','Needs reproduction','Triaged','Shared with product','Resolved']}],['owner','Internal owner'],['deployment','Linked intervention',{options:[{label:'No linked intervention',value:''},...workspace.deployments.map(d=>({label:d.id+' · '+d.title,value:d.id}))],optional:true}]];config.forEach(([k,l,opts])=>field(c,'fb-',k,l,f[k],opts));$('feedback-editor').hidden=false;$('feedback-editor').scrollIntoView({block:'start'});
}
function saveFeedback(e){e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.id=editingFeedback??'FB-'+crypto.randomUUID().slice(0,8);const index=workspace.feedback.findIndex(x=>x.id===f.id);if(index<0)workspace.feedback.push(f);else workspace.feedback[index]=f;$('feedback-editor').hidden=true;editingFeedback=null;saveInternal()}

function initializeConnectors(){
  const entry=node('button','⌘  Connectors','navbutton connector-entry');entry.dataset.page='connectors';document.querySelector('.sidebar-bottom').prepend(entry);
  const section=node('section','');section.dataset.screen='connectors';section.hidden=true;
  section.innerHTML=`<div class="heading"><div><div class="eyebrow">Workspace settings / integrations</div><h1>Connect your account context.</h1><p class="muted">AI tool telemetry, internal systems, and MCP servers.</p></div></div><div class="internal-banner">Live checks verify access only. The workspace continues to use synthetic data; no live records are ingested. Credentials stay in server environment variables.</div><div id="connector-catalog" class="record-grid"></div><div id="connector-status" class="internal-banner" role="status">Choose a provider to configure or test.</div><section id="connector-setup" class="editor" hidden><h2 id="connector-title"></h2><div id="connector-guide"></div><div class="form-buttons"><button id="connector-test" class="action primary">Test server connection</button><button id="connector-close" class="action">Close setup</button></div></section>`;
  document.querySelector('main').append(section);
  let current='cursor';const demo={},verified={};try{const state=JSON.parse(localStorage.getItem('signal-demo-connections'));for(const k of ['crm','slack','support','tracker'])demo[k]=state?.[k]===true}catch{}
  const providers=[['cursor','Developer-tool API','Admin, Analytics and AI Code Tracking. Live check currently verifies Admin member access only.'],['mcp','MCP server','An authorized remote Streamable HTTP server. JSON handshake check; no tool execution or ingestion.'],['crm','Internal CRM','Account objectives, stakeholders and commitments. Simulated adapter.'],['slack','Team chat','Account-channel feedback and blockers. Simulated adapter.'],['support','Customer support','Support friction and escalation context. Simulated adapter.'],['tracker','Progress tracker','Deployment milestones and agent-run references. Simulated adapter.']];
  function draw(){ $('connector-catalog').replaceChildren();providers.forEach(([id,title,desc])=>{const live=['cursor','mcp'].includes(id),r=node('article','','record');r.append(node('div',live?'API CONNECTION CHECK':'DEMO ADAPTER','eyebrow'),node('h2',title),node('span',live?(verified[id]===true?'Access check passed':verified[id]===false?'Check failed':'Not verified this session'):demo[id]?'Demo enabled':'Not connected','badge'),node('p',desc,'muted'));if(live)r.append(button('Configure / test',()=>{current=id;$('connector-title').textContent=title+' setup';$('connector-guide').replaceChildren(node('p',id==='cursor'?'Set TELEMETRY_API_KEY in the server environment. Restart npm start, then test. This checks the bundled provider-specific Admin adapter; other providers require a compatible adapter.':'Set SIGNAL_MCP_URL to your authorized HTTPS endpoint; optionally set SIGNAL_MCP_TOKEN for bearer authentication. Restart npm start, then test. OAuth, stdio and SSE initialization responses are not supported by this limited probe.'),node('p','No credentials are requested or saved in this browser. A successful check does not connect these sources to the diagnostic.','small'));$('connector-setup').hidden=false;$('connector-setup').scrollIntoView({block:'start'})}));else r.append(button(demo[id]?'Disable demo':'Enable demo',()=>{demo[id]=!demo[id];try{localStorage.setItem('signal-demo-connections',JSON.stringify(demo))}catch{}$('connector-status').textContent=demo[id]?title+': simulated adapter enabled. No external connection or data sync.':title+': demo disabled. Existing sample records are retained.';draw()}));$('connector-catalog').append(r)})}
  $('connector-close').onclick=()=>{$('connector-setup').hidden=true};$('connector-test').onclick=async()=>{const b=$('connector-test');b.disabled=true;const provider=current;$('connector-status').textContent='Testing '+provider+'…';try{const r=await fetch('/api/connections/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})});const result=await r.json();verified[provider]=result.ok===true;draw();$('connector-status').textContent=(result.ok?'Verified check · ':'Not connected · ')+result.message;}catch{$('connector-status').textContent='Connection service unavailable. Restart the updated local server and try again.'}finally{b.disabled=false}};draw();
}

function initializeAgents(){
  const nav=document.querySelector('nav');const entry=node('button','Agent operations','navbutton');entry.dataset.page='agents';nav.append(entry);
  const section=node('section','');section.dataset.screen='agents';section.hidden=true;section.innerHTML=`<div class="heading"><div><div class="eyebrow">Internal orchestration / three-agent workflow</div><h1>From evidence to action.</h1><p class="muted">Triage → explain → create internal drafts.</p></div><button id="agent-run" class="action primary">Run workflow ▶</button></div><div class="mini-stats"><div><h2>01 / Customer triage</h2><p class="small">Account summary, blocked work and evidence gaps.</p></div><div><h2>02 / Solution planner</h2><p class="small">Decision paths, hypotheses and measurement plans.</p></div><div><h2>03 / Internal execution</h2><p class="small">Create deduplicated draft tasks. No external writes.</p></div></div><div class="internal-banner">Offline deterministic mode · fixed synthetic data through 28 Sep 2026. The optional model-assisted adapter is not enabled in this UI. Tasks and run history are stored server-side in SQLite.</div><div class="form-buttons"><button id="agent-refresh" class="action">Refresh run history</button><a class="action" href="#agent-policy">Overnight operation ↓</a></div><p id="agent-status" class="small" role="status">Load history or run the workflow.</p><div id="agent-latest"></div><h2>Internal action queue</h2><p class="small">Generated targets remain unagreed. Import a draft into Deployment plans, agree its target and assign an owner before delivery.</p><div id="agent-tasks" class="record-grid"></div><details class="editor"><summary>Run history</summary><div id="agent-history"></div></details><section id="agent-policy" class="internal-banner"><h2>Overnight operation</h2><p>The nightly CLI reuses the latest saved snapshot, without an open browser or web server. It does not fetch fresh customer telemetry. A schedule has not been enabled; the requested time is awaiting confirmation.</p><code>python agents/workflow.py nightly</code><p>Local scheduling requires the computer and scheduled runner to be available. Browser edits enter the snapshot only when you run the workflow again.</p></section>`;document.querySelector('main').append(section);
  const summary=node('div','No triage run loaded. Open Agent operations to run the workflow.','internal-banner');summary.id='agent-account-summary';document.querySelector('[data-screen="overview"] .heading').after(summary);
  async function request(path,body={}){const response=await fetch('/api/agents/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok||result.error)throw Error(result.error||'Agent service unavailable');return result}
  async function refresh(){try{const result=await request('history');paint(result)}catch(e){$('agent-status').textContent=e.message}}
  function paint(data){
    $('agent-history').replaceChildren();$('agent-tasks').replaceChildren();$('agent-latest').replaceChildren();const latest=data.runs[0],lastGood=data.runs.find(r=>r.status==='complete');
    if(latest){const card=node('div','','internal-banner');card.append(node('h2',latest.status==='complete'?'Workflow complete':'Workflow failed'),node('p',latest.at+' · '+latest.mode,'small'));for(const stage of latest.stages??[]){const details=node('details','');details.append(node('summary',stage.name));if(stage.summary)details.append(node('p',stage.summary));if(stage.plans)for(const p of stage.plans)details.append(node('p',p.team+' · '+p.rule+' · '+p.why));if(stage.actions)for(const a of stage.actions)details.append(node('p',a.team+' · '+a.result));card.append(details)}$('agent-latest').append(card)}
    if(lastGood){$('agent-account-summary').textContent='Latest completed triage · '+lastGood.at+' — '+lastGood.stages[0].summary+' Fixed synthetic window ends 28 Sep; not fresh daily telemetry.'}
    for(const run of data.runs)$('agent-history').append(node('p',run.at+' · '+run.status+' · '+run.id,'small'));
    for(const t of data.tasks){const card=node('article','','record');card.append(node('div',t.kind+' / '+t.team,'eyebrow'),node('h2',t.action),labelValue('Why',t.why),labelValue('Evidence',t.evidence_id),labelValue('Success criterion',t.success_criterion),labelValue('Target','Not agreed'),labelValue('Status',t.status));const imported=workspace.deployments.some(d=>d.id==='AGENT-'+t.id);const b=button(imported?'Already in Deployment plans':'Prepare deployment draft',()=>{
      if(workspace.deployments.some(d=>d.id==='AGENT-'+t.id))return;
      const record={id:'AGENT-'+t.id,title:t.team+' / '+t.rule,team:t.team,objective:t.success_criterion,owner:t.owner,partner:t.team+' lead',status:'Planned',due:'',metric:t.metric,unit:'%',direction:'increase',baseline:t.baseline??0,target:0,actual:null,guardrail:'Agree review-quality criteria with the customer',quality:'Not assessed',source:'Agent run / '+t.evidence_id+' (synthetic)',observed:'',evidence:t.why,hypothesis:'Investigation hypothesis; root cause not established.',action:t.action};
      navigate('deployments');openDeployment();editingDeployment=null;
      for(const [k,v]of Object.entries(record)){const input=$('dep-'+k);if(input)input.value=v??''}
      $('dep-team').dispatchEvent(new Event('change'));
      // Require the user to choose the target and baseline rather than invent them.
      $('dep-target').value='';if(t.baseline===null)$('dep-baseline').value='';
      editingDeployment=record.id;
    });b.disabled=imported;card.append(b);$('agent-tasks').append(card)}
    if(!data.tasks.length)$('agent-tasks').append(node('p','No local tasks yet. Run the workflow to create draft actions.','muted'));
  }
  $('agent-refresh').onclick=refresh;$('agent-run').onclick=async()=>{const b=$('agent-run');b.disabled=true;$('agent-status').textContent='Running triage, solution planning and internal execution…';try{const result=await request('run',{workspace});$('agent-status').textContent=result.status==='complete'?'Completed. Existing drafts are retained; repeated runs do not duplicate tasks.':'Run failed; no tasks committed.';await refresh()}catch(e){$('agent-status').textContent=e.message}finally{b.disabled=false}};
  refresh();
}

function mountEvidencePicker(container){
 const wrap=node('div','','internal-banner');wrap.append(node('h3','Link measurable records'),node('p','Choose a team record to populate a measurement. Existing manual measurements remain manual unless explicitly linked. A historical comparison is not proof of an intervention effect.','small'));
 const select=node('select','');select.setAttribute('aria-label','Telemetry evidence record');
 function refresh(){select.replaceChildren();for(const e of evidenceCatalog.records.filter(e=>e.team===$('dep-team').value&&validEvidence(e))){const option=node('option',evidenceLabel(e));option.value=e.id;select.append(option)}}
 refresh();$('dep-team').addEventListener('change',refresh);wrap.append(select);
 const status=node('p',[editingEvidence.baselineEvidence,editingEvidence.outcomeEvidence].filter(Boolean).map(evidenceLabel).join(' | ')||'No measurements linked. Current values are manual.','small');
 for(const kind of ['baseline','outcome'])wrap.append(button('Use as '+kind,()=>{const e=evidenceCatalog.records.find(e=>e.id===select.value);if(!e)return;const d=Object.fromEntries(new FormData($('deployment-form')));const linked=linkMeasurement(d,e,kind);for(const k of ['metric','unit',kind==='baseline'?'baseline':'actual',...(kind==='outcome'?['observed','source','evidence']:[])])$('dep-'+k).value=linked[k];editingEvidence[kind==='baseline'?'baselineEvidence':'outcomeEvidence']=linked[kind==='baseline'?'baselineEvidence':'outcomeEvidence'];status.textContent='Linked '+kind+': '+evidenceLabel(e)}));
 wrap.append(status);container.append(wrap);
}
