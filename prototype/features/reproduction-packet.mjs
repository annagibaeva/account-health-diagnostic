const REQUIRED = ['title', 'environment', 'steps', 'expected', 'actual', 'owner'];
export function packetCompleteness(packet) {
  const missing = REQUIRED.filter(key => typeof packet[key] !== 'string' || !packet[key].trim());
  return { complete: missing.length === 0, missing };
}

export function packetExport(packet, humanConfirmed) {
  if (!humanConfirmed) throw new Error('Confirm a manual sensitive-data review before export.');
  return {
    notice: 'SYNTHETIC INTERNAL PORTFOLIO RECORD. Human-reviewed export; sanitization is not automated. No external ticket was sent.',
    ...Object.fromEntries(['id','feedbackId','deploymentId',...REQUIRED,'sanitizedEvidence','workaround','status','updatedAt'].map(key => [key, String(packet[key] ?? '')]))
  };
}

export function mountReproductionPacket(ctx) {
  const { node, button, field, getWorkspace, saveWorkspace, navigate } = ctx;
  const section = node('section', '');
  section.dataset.screen = 'packets'; section.hidden = true;
  const nav = node('button', '03 · Technical issues', 'navbutton');
  nav.dataset.page = 'packets'; document.querySelector('nav').append(nav);
  document.querySelector('main').append(section);
  const heading = node('div', '', 'heading'), introduction = node('div', '');
  introduction.append(node('h1', '03 · Technical issues'));
  heading.append(introduction, button('New issue +', () => edit()));
  const message = node('p', '', 'small'); message.setAttribute('role', 'status');
  const list = node('div', '', 'record-grid');
  const editor = node('section', '', 'editor'); editor.hidden = true;
  section.append(heading, node('div', 'Internal records · No external ticket submitted.', 'small'), message, list, editor, button('Continue to outcome review →', () => navigate('outcomes')));
  function packets() { return getWorkspace().reproductionPackets ?? []; }
  function line(label, value) { return node('p', `${label} · ${value || 'Not recorded'}`); }
  function download(packet, format, confirmed) {
    let content;
    try { content = packetExport(packet, confirmed); } catch (error) { message.textContent = error.message; return; }
    const text = format === 'json' ? JSON.stringify(content, null, 2) : Object.entries(content).map(([key,value]) => `${key}\n${value}`).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `reproduction-${String(packet.id).replace(/[^a-z0-9_-]/gi, '')}.${format === 'json' ? 'json' : 'txt'}`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.textContent = 'Export downloaded after your manual review. No external system updated.';
  }
  function render() {
    list.replaceChildren();
    if (!packets().length) list.append(node('p', 'No technical issues yet.', 'muted'));
    for (const packet of packets()) {
      const check = packetCompleteness(packet), card = node('article', '', 'record');
      const feedback = getWorkspace().feedback.find(item => item.id === packet.feedbackId);
      const deployment = getWorkspace().deployments.find(item => item.id === packet.deploymentId);
      card.append(node('div', `${packet.id} / INTERNAL`, 'eyebrow'), node('h2', packet.title || 'Untitled packet'), node('span', packet.status || 'Draft', 'badge'), line('Feedback', feedback ? `${feedback.id} · ${feedback.title}` : packet.feedbackId ? `${packet.feedbackId} (unavailable)` : 'Not linked'), line('Intervention', deployment ? `${deployment.id} · ${deployment.title}` : packet.deploymentId ? `${packet.deploymentId} (unavailable)` : 'Not linked'), line('Owner', packet.owner), line('Completeness', check.complete ? 'Required reproduction fields complete; reproducibility still requires investigation.' : `Missing: ${check.missing.join(', ')}`));
      const detail = node('details', ''); detail.append(node('summary', 'Inspect reproduction evidence'));
      if(deployment){card.append(button('Open linked intervention',()=>{ctx.navigate('deployments');ctx.openDeployment(deployment.id)}));if(ctx.recordLinks)card.append(ctx.recordLinks(deployment));}
      if(feedback)card.append(button('Open customer feedback',()=>{ctx.navigate('feedback');ctx.openFeedback(feedback.id)}));
      for (const [key,label] of [['environment','Environment'],['steps','Steps'],['expected','Expected'],['actual','Actual'],['sanitizedEvidence','Manually prepared evidence'],['workaround','Workaround']]) detail.append(line(label, packet[key]));
      card.append(detail, button('Edit issue', () => edit(packet.id)));
      const label = node('label', ''), confirm = document.createElement('input'); confirm.type = 'checkbox';
      label.append(confirm, document.createTextNode(' I manually reviewed this packet for secrets, personal data and customer-sensitive content.'));
      const controls = node('div', '', 'form-buttons');
      const json = button('Export JSON', () => download(packet, 'json', confirm.checked));
      const txt = button('Export text', () => download(packet, 'text', confirm.checked));
      json.disabled = txt.disabled = true; confirm.onchange = () => { json.disabled = txt.disabled = !confirm.checked; };
      controls.append(json, txt); card.append(label, controls); list.append(card);
    }
  }
  function edit(id) {
    const workspace = getWorkspace();
    const packet = packets().find(item => item.id === id) ?? { status: 'Draft' };
    editor.replaceChildren(node('h2', id ? 'Edit issue' : 'New issue'));
    const form = document.createElement('form'), fields = node('div', '', 'form-grid');
    const configs = [
      ['title','Title'],
      ['feedbackId','Linked feedback',{options:[{value:'',label:'No linked feedback'},...workspace.feedback.map(item => ({value:item.id,label:`${item.id} · ${item.title}`}))]}],
      ['deploymentId','Linked intervention',{options:[{value:'',label:'No linked intervention'},...workspace.deployments.map(item => ({value:item.id,label:`${item.id} · ${item.title}`}))]}],
      ['environment','Environment / version / relevant configuration',{type:'textarea'}],
      ['steps','Numbered reproduction steps',{type:'textarea'}],
      ['expected','Expected behavior',{type:'textarea'}],
      ['actual','Actual behavior',{type:'textarea'}],
      ['sanitizedEvidence','Manually prepared evidence (no automatic sanitization)',{type:'textarea'}],
      ['workaround','Workaround / none known',{type:'textarea'}],
      ['owner','Internal owner'],
      ['status','Investigation status',{options:['Draft','Ready to reproduce','Reproduced']}]
    ];
    for (const [key,label,options={}] of configs) field(fields, 'packet-', key, label, packet[key], {...options,optional:true});
    const error = node('p', '', 'small'); error.setAttribute('role', 'alert');
    form.append(fields, node('p', 'Drafts may be incomplete. Ready and Reproduced require environment, steps, expected and actual behavior, title and owner. Reproduced is a manual investigator attestation.', 'small'), error);
    const controls = node('div', '', 'form-buttons'), save = node('button', 'Save packet', 'action primary'); save.type = 'submit';
    controls.append(save, button('Cancel', () => { editor.hidden = true; })); form.append(controls);
    form.onsubmit = event => {
      event.preventDefault();
      const record = Object.fromEntries(new FormData(form));
      for (const key of Object.keys(record)) record[key] = record[key].trim();
      const check = packetCompleteness(record);
      if (record.status !== 'Draft' && !check.complete) { error.textContent = `Complete these fields before marking ${record.status}: ${check.missing.join(', ')}.`; return; }
      record.id = id ?? `REP-${crypto.randomUUID().slice(0,8)}`; record.updatedAt = new Date().toISOString();
      const current = getWorkspace(); current.reproductionPackets ??= [];
      const index = current.reproductionPackets.findIndex(item => item.id === record.id);
      if (index < 0) current.reproductionPackets.push(record); else current.reproductionPackets[index] = record;
      editor.hidden = true; saveWorkspace(); render(); message.textContent = 'Packet saved locally. No external ticket sent.';
    };
    editor.append(form); editor.hidden = false; editor.scrollIntoView({block:'start'});
  }
  render(); return { render };
}
