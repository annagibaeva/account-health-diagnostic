export const teams = [
  {name:'Digital Channels',size:90,a:78,p:73,u:84,c:43},
  {name:'Payments',size:80,a:48,p:64,u:82,c:32},
  {name:'Core Banking',size:85,a:35,p:34,u:36,c:14},
  {name:'Risk & Compliance',size:55,a:52,p:46,u:44,c:18},
  {name:'Data Platform',size:50,a:70,p:60,u:72,c:39},
  {name:'Developer Platform',size:40,a:76,p:74,u:88,c:null}
];
export const actions = [
  'Repair missing Analytics responses before interpreting adoption.',
  'Validate code attribution against an independently defined repository sample.',
  'Collect a comparable baseline before interpreting acceptance change.',
  'Review 20 rejected diffs with the team lead and classify task-fit or context issues.',
  'Pair a champion with a small pilot group on one bounded legacy-code task.',
  'Review the workflow and repository context behind declining acceptance.',
  'Consider expanding one adjacent workflow after suitability and quality review.',
  'Share one reviewed workflow with another team; monitor code review findings.',
  'Discuss adoption barriers and appropriate use cases with the team lead.'
];
export const branches = [
  'Current evidence insufficient → repair Analytics',
  'Contribution unavailable → repair code tracking',
  'Prior evidence insufficient → collect baseline',
  'Stalled + active share ≥70% → review rejected edits',
  'Stalled + active share <70% → bounded pilot',
  'Otherwise declining → review workflow',
  'Otherwise improvement >2 points → consider expansion',
  'Otherwise score ≥70 → share reviewed practices',
  'Otherwise → investigate barriers'
];
export function diagnose(t, scenario='normal') {
  const valid=scenario!=='current', comparable=valid&&scenario!=='prior';
  const contribution=scenario==='tracking'?null:t.c;
  const score=valid?.7*t.a+.3*t.u:null;
  const delta=comparable?t.a-t.p:null;
  const stalled=comparable?t.a<55&&delta<=2:null;
  const declining=comparable?delta<=-10:null;
  const action=!valid?0:contribution===null?1:!comparable?2:stalled?(t.u>=70?3:4):declining?5:delta>2?6:score>=70?7:8;
  return {valid,comparable,contribution,score,delta,stalled,declining,action,status:!valid?'Insufficient evidence':score>=70?'Healthy adoption':score>=50?'Watch':'Needs attention'};
}
export function account(selected, scenario) {
  let sum=0,headcount=0;
  teams.forEach((t,i)=>{const d=diagnose(t,i===selected?scenario:'normal');if(d.score!==null){sum+=d.score*t.size;headcount+=t.size}});
  return {headcount,score:headcount>=320?sum/headcount:null};
}

// Internal-workspace records are fictional, separate from API telemetry fixtures.
export function initialWorkspace() {
  return {version:1, deployments:[
    {id:'DEP-001',title:'Payments context pilot',team:'Payments',objective:'Improve fit of AI suggestions in payment-service maintenance',owner:'Maya Tan · Deployment',partner:'Payments engineering lead',status:'In progress',due:'2026-10-14',metric:'Agent diff acceptance',unit:'%',direction:'increase',baseline:48,target:56,actual:null,guardrail:'No increase in review rework',quality:'Not assessed',source:'Usage analytics + peer-review sample (simulated)',observed:'',evidence:'Compare adjacent 28-day windows; collect at least 100 suggested diffs. Baseline: 480 / 1,000 accepted.',hypothesis:'Repository context may be contributing to rejected edits.',action:'Run a context-configuration workshop and a two-week champion pilot.'},
    {id:'DEP-002',title:'Core Banking bounded pilot',team:'Core Banking',objective:'Establish a repeatable legacy-code workflow',owner:'Jon Lim · Field Engineering',partner:'Core Banking champion',status:'Planned',due:'2026-10-21',metric:'Pilot tasks completed with peer approval',unit:'tasks',direction:'increase',baseline:0,target:10,actual:null,guardrail:'All completed tasks receive peer review',quality:'Not assessed',source:'Pilot tracker (simulated)',observed:'',evidence:'Count approved pilot tasks, not generated lines.',hypothesis:'A smaller task scope and champion pairing may improve task fit.',action:'Select one safe maintenance task and pair a champion with the pilot cohort.'},
    {id:'DEP-003',title:'Validate contribution tracking',team:'Developer Platform',objective:'Make contribution attribution interpretable',owner:'Leah Chen · Field Engineering',partner:'Developer Platform lead',status:'Blocked',due:'2026-10-07',metric:'Sample repositories with verified tracking',unit:'%',direction:'increase',baseline:40,target:100,actual:60,guardrail:'No unmatched identities in the verification sample',quality:'Not assessed',source:'Repository inventory audit (simulated)',observed:'2026-09-28',evidence:'3 of 5 sample repositories verified; access to 2 remains blocked. Sample coverage is not bank-wide coverage.',hypothesis:'Repository setup differences may explain missing attribution.',action:'Verify attribution against five agreed repositories and resolve missing access.'}
  ],feedback:[
    {id:'FB-001',title:'Context setup is hard to repeat across repositories',team:'Payments',workflow:'Payment-service maintenance',impact:'Champions repeat setup before reviewing generated changes.',evidence:'SIM-SUPPORT-014: two champion reports; reproduction pending.',severity:'Medium',status:'Needs reproduction',owner:'Jon Lim · Field Engineering',deployment:'DEP-001'},
    {id:'FB-002',title:'Attribution visibility differs across pilot repositories',team:'Developer Platform',workflow:'Contribution tracking',impact:'The account team cannot interpret contribution for the full sample.',evidence:'SIM-AUDIT-003: three of five repositories verified.',severity:'High',status:'Triaged',owner:'Leah Chen · Field Engineering',deployment:'DEP-003'}]};
}
export function outcome(d) {
  if(d.actual===null||!Number.isFinite(d.actual)||!d.observed||!d.evidence.trim())return 'Insufficient evidence';
  if(d.quality==='Failed')return 'Guardrail failed';
  if(d.quality!=='Passed')return 'Quality review pending';
  return (d.direction==='increase'?d.actual>=d.target:d.actual<=d.target)?'Target met':'Target not met';
}
export function successMetrics(records) {
  const assessable=records.filter(d=>['Target met','Target not met','Guardrail failed'].includes(outcome(d)));
  return {total:records.length,met:records.filter(d=>outcome(d)==='Target met').length,assessable:assessable.length,complete:records.filter(d=>d.status==='Complete').length,blocked:records.filter(d=>d.status==='Blocked').length,pending:records.filter(d=>outcome(d)==='Insufficient evidence'||outcome(d)==='Quality review pending').length};
}
