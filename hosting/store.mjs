import {initialWorkspace} from '../prototype/diagnostic.mjs';
import {canExpand,reviewFingerprint} from '../prototype/features/outcome-review.mjs';
import {qbrExport} from '../prototype/features/reviewed-qbr.mjs';
import {evidence} from '../prototype/evidence-data.mjs';
import {evidenceCurrent} from '../prototype/features/evidence.mjs';
export function validateWorkspace(w){
 if(!w||w.version!==1||!Array.isArray(w.deployments)||!Array.isArray(w.feedback))throw Error('Invalid workspace');
 function walk(v,depth=0){if(depth>14)throw Error('Workspace nesting limit');if(typeof v==='string'&&v.length>100000)throw Error('Text too long');if(typeof v==='number'&&!Number.isFinite(v))throw Error('Invalid number');if(v&&typeof v==='object'){if(Object.keys(v).length>2000)throw Error('Too many records');for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Invalid key');walk(x,depth+1)}}}walk(w);
 for(const list of [w.deployments,w.feedback,w.reproductionPackets??[],w.outcomeReviews??[]]){if(!Array.isArray(list)||list.length>1000)throw Error('Invalid record list');}
 const ids=new Set();for(const d of w.deployments){if(!d||typeof d.id!=='string'||ids.has(d.id)||typeof d.title!=='string'||!Number.isFinite(d.baseline)||!Number.isFinite(d.target)||(d.actual!==null&&!Number.isFinite(d.actual)))throw Error('Invalid intervention');ids.add(d.id)}
 return structuredClone(w);
}
export function store(db){return {
 async kvGet(key){const r=await db.prepare('SELECT revision,payload FROM operations WHERE key=?').bind(key).first();return r?{revision:r.revision,value:JSON.parse(r.payload)}:{revision:0,value:null}},
 async kvPut(key,revision,value){const r=revision===0?await db.prepare('INSERT OR IGNORE INTO operations (key,revision,payload) VALUES (?,1,?)').bind(key,JSON.stringify(value)).run():await db.prepare('UPDATE operations SET revision=revision+1,payload=? WHERE key=? AND revision=?').bind(JSON.stringify(value),key,revision).run();return r.meta.changes===1},
 async get(){await db.prepare('INSERT OR IGNORE INTO workspace (id,revision,payload,actor,updated_at) VALUES (?,?,?,?,?)').bind('default',0,JSON.stringify(initialWorkspace()),'system',new Date().toISOString()).run();const r=await db.prepare('SELECT revision,payload,actor,updated_at FROM workspace WHERE id=?').bind('default').first();return {revision:r.revision,workspace:JSON.parse(r.payload),actor:r.actor,updatedAt:r.updated_at}},
 async put(revision,workspace,actor){const w=validateWorkspace(workspace);const now=new Date().toISOString();const old=await this.get();if(old.revision!==revision)return null;
 // Record the authenticated writer separately from user-entered reviewer display names.
 const same=(a,b)=>{const strip=v=>{if(!v)return v;const {actor,recordedAt,...rest}=v;return rest};return JSON.stringify(strip(a))===JSON.stringify(strip(b))};
 if(w.reviewedQbr?.approval){const previous=old.workspace.reviewedQbr?.approval;if(same(w.reviewedQbr.approval,previous))Object.assign(w.reviewedQbr.approval,{actor:previous.actor,recordedAt:previous.recordedAt});else {if(!w.successPlan?.customerGoal?.trim()||!w.reviewedQbr.approval.reviewer?.trim())throw Error("QBR goal and reviewer required");qbrExport(w,evidence);Object.assign(w.reviewedQbr.approval,{actor,recordedAt:now})}}
 for(const r of w.outcomeReviews??[]){const previous=old.workspace.outcomeReviews?.find(x=>x.deploymentId===r.deploymentId);if(same(r,previous)){Object.assign(r,{actor:previous.actor,recordedAt:previous.recordedAt});continue}const d=w.deployments.find(x=>x.id===r.deploymentId);if(!['Collect evidence','Expand','Revise','Stop'].includes(r.decision)||!d||!r.reviewer?.trim()||!r.notes?.trim()||r.evidenceSnapshot!==reviewFingerprint(d)||(r.decision==='Expand'&&(!canExpand(d)||[d.baselineEvidence,d.outcomeEvidence].some(e=>e&&!evidenceCurrent(e,evidence)))))throw Error('Outcome review requires current evidence and a valid decision');Object.assign(r,{actor,recordedAt:now})}
 const result=await db.prepare('UPDATE workspace SET revision=revision+1,payload=?,actor=?,updated_at=? WHERE id=? AND revision=?').bind(JSON.stringify(w),actor,now,'default',revision).run();if(result.meta.changes!==1)return null;return {revision:revision+1,workspace:w,actor,updatedAt:now}},
 async history(){const r=await db.prepare('SELECT payload FROM shared_runs ORDER BY at DESC LIMIT 20').all();const t=await db.prepare('SELECT payload FROM shared_tasks').all();return {runs:r.results.map(x=>JSON.parse(x.payload)),tasks:t.results.map(x=>JSON.parse(x.payload))}},
 async saveRun(run,tasks){await db.batch([...tasks.map(t=>db.prepare('INSERT OR IGNORE INTO shared_tasks (id,payload) VALUES (?,?)').bind(t.id,JSON.stringify(t))),db.prepare('INSERT INTO shared_runs (id,at,payload) VALUES (?,?,?)').bind(run.id,run.at,JSON.stringify(run))])}
}}
