// The inbox is a view of source records, never a second task store.
const DAY = 86400000;
function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const stamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : null;
}
export function localToday(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function deriveInbox(workspace = {}, today = localToday()) {
  const current = dateValue(today);
  if (current === null) throw new Error('Inbox requires a valid YYYY-MM-DD as-of date');
  const items = [];
  for (const d of workspace.deployments ?? []) {
    const reasons = [];
    let priority = 3;
    const complete = ['Complete','Cancelled'].includes(d.status);
    const due = dateValue(d.due);
    if (!complete) {
      if (d.status === 'Blocked') { reasons.push('Blocked — resolve the dependency with the owner.'); priority = 0; }
      if (due !== null && due < current) { reasons.push('Overdue — confirm a revised commitment or record completion.'); priority = Math.min(priority, 1); }
      else if (due !== null && due <= current + 7 * DAY) { reasons.push('Due within 7 days — confirm the next step.'); priority = Math.min(priority, 2); }
      if (due === null) reasons.push('Due date unavailable — agree a review date.');
    }
    // Completed execution can still need outcome evidence. Never infer zero from missing data.
    if (d.status !== 'Cancelled') {
      if (!Number.isFinite(d.actual) || !d.observed || !String(d.evidence ?? '').trim()) reasons.push('Outcome evidence pending — record a measurement, observation date and evidence.');
      if (Array.isArray(d.recommendationEvidence)&&!d.recommendationEvidence.length) reasons.push('Diagnostic evidence link missing — link the recommendation to measurable records.');
      if (d.quality === 'Failed') { reasons.push('Quality guardrail failed — review before expanding.'); priority = 0; }
      else if (d.quality !== 'Passed') reasons.push('Quality review pending — assess the agreed guardrail.');
    }
    if (reasons.length) items.push({id:'deployment:'+d.id,source:'deployment',sourceId:d.id,title:d.title,team:d.team,owner:d.owner || 'Unassigned',due:due === null ? null : d.due,actual:Number.isFinite(d.actual)?d.actual:null,reasons,priority});
  }
  for (const f of workspace.feedback ?? []) {
    if (!['New','Needs reproduction'].includes(f.status)) continue;
    const due=dateValue(f.due),overdue=due!==null&&due<current;
    items.push({id:'feedback:'+f.id,source:'feedback',sourceId:f.id,title:f.title,team:f.team,owner:f.owner || 'Unassigned',due:due===null?null:f.due,actual:null,priority:overdue||f.severity === 'High'?1:2,reasons:[...(overdue?['Overdue']:[]),f.status === 'New'?'Feedback needs triage.':'Reproduction needed.']});
  }
  return items.sort((a,b)=>a.priority-b.priority || (a.due??'9999').localeCompare(b.due??'9999') || String(a.id).localeCompare(String(b.id)));
}

export function mountActionInbox(ctx) {
  const {node,button} = ctx;
  let owner = 'All owners';
  const section = node('section',''); section.dataset.screen = 'inbox'; section.hidden = true;
  const nav = node('button','02 · Action inbox','navbutton'); nav.dataset.page='inbox'; nav.type='button';
  document.querySelector('nav').append(nav);
  document.querySelector('main').append(section);
  function render() {
    const today = localToday(), items = deriveInbox(ctx.getWorkspace(),today);
    const owners = [...new Set(items.map(item=>item.owner))].sort();
    if (!owners.includes(owner)) owner='All owners';
    section.replaceChildren();
    const heading=node('div','','heading'), intro=node('div','');
    intro.append(node('h1','02 · Action inbox'),node('p',`As of ${today}`,'muted'));
    heading.append(intro,button('Refresh priorities',render)); section.append(heading);
    const label=node('label','Owner','filter-label'), select=node('select',''); select.setAttribute('aria-label','Filter inbox by owner');
    for (const name of ['All owners',...owners]) {const option=node('option',name);option.value=name;select.append(option)}
    select.value=owner;select.onchange=()=>{owner=select.value;render()};label.append(select);section.append(label);
    const visible=items.filter(item=>owner==='All owners'||item.owner===owner);
    section.append(node('p',`${visible.length} actions need attention`,'small'));
    const grid=node('div','','record-grid');section.append(grid);
    if (!visible.length) grid.append(node('p','No open attention items match this owner.','muted'));
    for (const item of visible) {
      const card=node('article','','record');card.append(node('div',`${item.sourceId} / ${item.team ?? 'Account'}`,'eyebrow'),node('h2',item.title));
      const reasons=node('ul','');for(const reason of item.reasons) reasons.append(node('li',reason));card.append(reasons);
      if(item.source==='deployment'&&ctx.openIntervention)card.append(button('Open intervention',()=>ctx.openIntervention(item.sourceId,'work')));
      if(item.source==='deployment') card.append(node('p',`Recorded result · ${item.actual === null?'Unavailable':item.actual}`,'small'),button('Open deployment / update outcome',()=>{ctx.navigate('deployments');ctx.openDeployment(item.sourceId)}));
      else card.append(button('Open feedback / triage',()=>{ctx.navigate('feedback');ctx.openFeedback(item.sourceId)}),button('Open technical issues',()=>ctx.navigate('packets')));
      const source=ctx.getWorkspace()[item.source==='deployment'?'deployments':'feedback'].find(r=>r.id===item.sourceId);
      const assignment=node('form','','assignment-form'),fields=node('div','','form-grid');
      const ownerInput=ctx.field(fields,'assign-'+item.sourceId+'-','owner','Owner',source.owner);
      const dueInput=ctx.field(fields,'assign-'+item.sourceId+'-','due','Due date',source.due,{type:'date',optional:true});
      const save=node('button','Save owner & date','action');save.type='submit';assignment.append(fields,save);
      assignment.onsubmit=e=>{e.preventDefault();if(!ownerInput.value.trim()){ownerInput.setCustomValidity('Enter an owner.');ownerInput.reportValidity();return}source.owner=ownerInput.value.trim();source.due=dueInput.value;ctx.saveWorkspace()};card.append(assignment);
      if(ctx.recordLinks){const links=node('details','');links.append(node('summary','Links & notifications'),ctx.recordLinks(source));card.append(links)}grid.append(card);
    }
  }
  render();
  return {render};
}
