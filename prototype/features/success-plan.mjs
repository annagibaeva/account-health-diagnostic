export function initialSuccessPlan() {
  return {
    sponsor: 'CTO · fictional stakeholder', champion: 'Payments engineering lead · fictional stakeholder',
    customerGoal: 'Improve payment-service maintenance while preserving review quality.',
    successCriteria: 'Proposed: validate one repeatable maintenance workflow with developer feedback and review-quality evidence. Targets require customer agreement.',
    reviewDate: '', notes: 'Discovery draft for a fictional account. No customer agreement has been recorded.',
    objectives: []
  };
}

export function mountSuccessPlan(ctx) {
  const {node, button, field} = ctx;
  const section = node('section', ''); section.dataset.screen = 'plan'; section.hidden = true;
  const heading = node('div', '', 'heading'); const intro = node('div', '');
  intro.append(node('div', '01 / ACCOUNT SUCCESS PLAN', 'eyebrow'), node('h1', 'Start with the customer’s goal.'), node('p', 'Connect objectives, stakeholders and the work that will demonstrate progress.', 'muted'));
  heading.append(intro, button('Next: action inbox →', () => ctx.navigate('inbox')));
  const banner = node('div', 'FICTIONAL INTERNAL ACCOUNT · Local browser records. Objectives and targets are proposals until independently agreed with the customer.', 'internal-banner');
  const form = node('form', '', 'editor'); form.id = 'success-plan-form';
  form.append(node('h2', 'Account intent & stakeholders'));
  const fields = node('div', '', 'form-grid'); form.append(fields);
  const submit = node('button', 'Save success plan', 'action primary'); submit.type = 'submit'; form.append(submit);
  const status = node('p', '', 'small'); status.setAttribute('role', 'status');
  const objectiveHeading = node('div', '', 'heading'); objectiveHeading.append(node('h2', 'Customer objectives'), button('Add objective +', () => editObjective()));
  const list = node('div', '', 'record-grid');
  const editor = node('form', '', 'editor'); editor.hidden = true; editor.id = 'success-objective-form';
  section.append(heading, banner, form, status, objectiveHeading, list, editor);
  document.querySelector('main').append(section);
  const nav = node('button', 'Account success plan', 'navbutton'); nav.dataset.page = 'plan'; document.querySelector('nav').append(nav);
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
    ctx.saveWorkspace(); status.textContent = 'Plan updated locally. Saving does not establish customer agreement.';
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
        ['sponsor','Executive sponsor'], ['champion','Technical champion'], ['reviewDate','Next account review',{type:'date',optional:true}], ['notes','Internal discovery notes',{type:'textarea',optional:true}]
      ]) inputs[key] = field(fields,'plan-',key,label,current[key],options);
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
