export function initialSuccessPlan() {
  return {
    sponsor: '', champion: '',
    customerGoal: 'Improve payment-service maintenance while preserving review quality.',
    successCriteria: 'Proposed: validate one repeatable maintenance workflow with developer feedback and review-quality evidence. Targets require customer agreement.',
    reviewDate: '', notes: '', sourceReferences: '',
    objectives: []
  };
}

export function mountSuccessPlan(ctx) {
  const {node, button, field} = ctx;
  const section = node('section', ''); section.dataset.screen = 'plan'; section.hidden = true;
  const heading = node('div', '', 'heading'); const intro = node('div', '');
  intro.append(node('h1', '01 · Account success plan'), node('p', 'Customer information (goals, objectives, owners).', 'muted'));
  heading.append(intro, button('Next: action inbox →', () => ctx.navigate('inbox')));
  const banner = node('div', 'Example customer · APAC banking · 400 engineers · 6 teams · Synthetic portfolio account', 'account-context');
  const form = node('form', '', 'editor'); form.id = 'success-plan-form';
  form.append(node('h2', 'Customer information'));

  const fields = node('div', '', 'form-grid'); form.append(fields);
  const submit = node('button', 'Save success plan', 'action primary'); submit.type = 'submit'; form.append(submit);
  const status = node('p', '', 'small'); status.setAttribute('role', 'status');
  const objectiveHeading = node('div', '', 'heading'); objectiveHeading.append(node('h2', 'Customer objectives'), button('Add objective +', () => editObjective()));
  const list = node('div', '', 'record-grid');
  const editor = node('form', '', 'editor'); editor.hidden = true; editor.id = 'success-objective-form';
  const sources = node('details', '', 'source-guide');sources.append(node('summary','Information sources'));
  sources.append(node('h3', 'Where account information comes from'), node('p', 'Meeting transcripts and customer conversations → goals, priorities and stakeholders. Contracts and CRM records → agreed scope and account details. QBRs and MBRs → discovery notes, decisions and next steps.', 'small'), node('p', 'Manual entry today. Automatic import and extraction are not connected. Record a document title, date and link below so another team member can verify the context.', 'muted'));
  form.insertBefore(sources, fields);
  section.append(heading, banner, form, status, objectiveHeading, list, editor);
  document.querySelector('main').append(section);
  const nav = node('button', '01 · Account success plan', 'navbutton'); nav.dataset.page = 'plan'; document.querySelector('nav').append(nav);
  let initialized = false;
  const plan = () => {
    const workspace = ctx.getWorkspace();
    if (!workspace.successPlan || typeof workspace.successPlan !== 'object') workspace.successPlan = initialSuccessPlan();
    if (!Array.isArray(workspace.successPlan.objectives)) workspace.successPlan.objectives = [];
    return workspace.successPlan;
  };
  const inputs = {};
  form.onsubmit = e => {
    e.preventDefault();
    for (const [key, input] of Object.entries(inputs)) plan()[key] = input.value.trim();
    ctx.saveWorkspace(); status.textContent = 'Changes submitted. Customer agreement should be documented in the source references.';
  };
  function editObjective(id) {
    const objective = plan().objectives.find(o => o.id === id) || {title:'',owner:'',targetDate:'',deploymentIds:[]};
    editor.replaceChildren(node('h2', id ? 'Edit objective' : 'New customer objective'));
    const grid = node('div', '', 'form-grid'); editor.append(grid);
    const title = field(grid, 'obj-', 'title', 'Objective / intended outcome', objective.title);
    const owner = field(grid, 'obj-', 'owner', 'Accountable owner', objective.owner);
    const date = field(grid, 'obj-', 'targetDate', 'Review date', objective.targetDate, {type:'date',optional:true});
    const links = node('fieldset', ''); links.append(node('legend', 'Linked interventions'));
    const checkboxes = [];
    for (const deployment of ctx.getWorkspace().deployments) {
      const label = node('label', ''); const input = document.createElement('input'); input.type = 'checkbox'; input.value = deployment.id;
      input.checked = objective.deploymentIds?.includes(deployment.id) || false;
      label.append(input, document.createTextNode(' ' + deployment.id + ' · ' + deployment.title)); links.append(label); checkboxes.push(input);
    }
    if (!checkboxes.length) links.append(node('p', 'Create an intervention in Deployment plans, then link it here.', 'muted'));
    editor.append(links);
    const controls = node('div', '', 'form-buttons'); const save = node('button', 'Save objective', 'action primary'); save.type = 'submit';
    controls.append(save, button('Cancel', () => {editor.hidden = true;})); editor.append(controls);
    editor.onsubmit = e => {
      e.preventDefault();
      const record = {id:id || 'OBJ-' + crypto.randomUUID().slice(0,8),title:title.value.trim(),owner:owner.value.trim(),targetDate:date.value,deploymentIds:checkboxes.filter(c => c.checked).map(c => c.value)};
      if (!record.title || !record.owner) {status.textContent = 'Objective and owner cannot be blank.';return;}
      const index = plan().objectives.findIndex(o => o.id === record.id);
      if (index === -1) plan().objectives.push(record); else plan().objectives[index] = record;
      editor.hidden = true; ctx.saveWorkspace(); status.textContent = 'Objective saved locally; linked interventions retain their own measurement targets.';
    };
    editor.hidden = false; title.focus(); editor.scrollIntoView({block:'nearest'});
  }
  function render() {
    const current = plan();
    if (!initialized) {
      for (const [key,label,options] of [
        ['customerGoal','Customer goal',{type:'textarea'}], ['successCriteria','Success criteria / agreement context',{type:'textarea'}],
        ['sponsor','Executive sponsor',{optional:true}], ['champion','Technical champion',{optional:true}], ['reviewDate','Next account review',{type:'date',optional:true}], ['notes','Internal discovery notes',{type:'textarea',optional:true}], ['sourceReferences','Source references',{type:'textarea',optional:true}]
      ]) inputs[key] = field(fields,'plan-',key,label,current[key],options);
      if(inputs.sponsor.value==='CTO · fictional stakeholder') inputs.sponsor.value='';
      if(inputs.champion.value==='Payments engineering lead · fictional stakeholder') inputs.champion.value='';
      if(inputs.notes.value==='Discovery draft for a fictional account. No customer agreement has been recorded.') inputs.notes.value='';
      inputs.sponsor.placeholder='e.g. CEO, CTO or VP of Engineering';
      inputs.champion.placeholder='e.g. Engineering lead, Staff engineer or Platform lead';
      inputs.notes.placeholder='Key context from QBRs, MBRs and customer conversations: priorities, decisions, blockers and next steps.';
      inputs.sourceReferences.placeholder='e.g. Quarterly business review · 1 Oct 2026 · document link · goal and next steps';
      initialized = true;
    }
    list.replaceChildren();
    if (!current.objectives.length) list.append(node('p', 'No objectives recorded yet. Add a customer objective and link the interventions that support it.', 'muted'));
    for (const objective of current.objectives) {
      const card = node('article', '', 'record');
      card.append(node('div', objective.id, 'eyebrow'), node('h2', objective.title), node('p', 'Owner · ' + objective.owner), node('p', 'Review · ' + (objective.targetDate || 'Not scheduled'), 'muted'));
      const links = objective.deploymentIds || [];
      if (!links.length) card.append(node('p', 'No intervention linked — delivery evidence is not yet defined.', 'small'));
      for (const id of links) {
        const deployment = ctx.getWorkspace().deployments.find(d => d.id === id);
        if (deployment) card.append(button(deployment.id + ' · ' + deployment.title, () => {ctx.navigate('deployments');ctx.openDeployment(id);}));
        else card.append(node('p', id + ' · Intervention unavailable', 'small'));
      }
      card.append(button('Edit objective', () => editObjective(objective.id))); list.append(card);
    }
  }
  render();
  return {render};
}
