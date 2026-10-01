import test from 'node:test';import assert from 'node:assert/strict';
import {openLocalDb} from './local-db.mjs';import {store} from './store.mjs';import {api} from './worker.mjs';import {runWorkflow} from './runtime.mjs';
import {qbrSource} from '../prototype/features/reviewed-qbr.mjs';
import {loadExampleIntervention,EXAMPLE_INTERVENTION_ID} from '../prototype/features/intervention-case.mjs';

test('example customer decision persists with actor and rejects an unsupported revised decision',async()=>{
 const db=openLocalDb(':memory:');try{const s=store(db),{workspace:w}=await s.get();loadExampleIntervention(w);
 const saved=await s.put(0,w,'operator');const d=saved.workspace.deployments.find(x=>x.id===EXAMPLE_INTERVENTION_ID);
 assert.equal(d.customerDecision.actor,'operator');assert.equal(d.customerDecision.synthetic,true);
 d.customerDecision.source='';await assert.rejects(s.put(1,saved.workspace,'operator'),/source|reference|rationale|required/i);
 assert.equal((await s.get()).revision,1);
 }finally{db.close()}
});
test('workspace CAS rejects stale writes and persists authenticated writer',async()=>{const db=openLocalDb(':memory:');try{const s=store(db),a=await s.get();a.workspace.actionOverrides={'0':'Reviewed workflow'};const b=await s.put(0,a.workspace,'user-1');assert.equal(b.revision,1);assert.equal(await s.put(0,a.workspace,'user-2'),null);assert.equal((await s.get()).actor,'user-1');assert.equal((await s.get()).workspace.actionOverrides[0],'Reviewed workflow')}finally{db.close()}});
test('API requires identity and same-origin writes',async()=>{const db=openLocalDb(':memory:');try{assert.equal((await api(new Request('https://example.test/api/workspace'),{DB:db})).status,401);assert.equal((await api(new Request('https://example.test/api/workspace',{method:'PUT',headers:{'oai-authenticated-user-id':'a'},body:'{}'}),{DB:db})).status,403)}finally{db.close()}});
test('workflow deduplicates tasks and records independent runs',async()=>{const db=openLocalDb(':memory:');try{const s=store(db);await runWorkflow(s);await runWorkflow(s);const h=await s.history();assert.equal(h.runs.length,2);assert.equal(h.tasks.length,7);assert.ok(h.runs[0].datasetVersion)}finally{db.close()}});
test('operations CAS claims exactly once',async()=>{const db=openLocalDb(':memory:');try{const s=store(db);assert.equal(await s.kvPut('action',0,{status:'approved'}),true);assert.equal(await s.kvPut('action',0,{}),false);assert.equal(await s.kvPut('action',1,{status:'executing'}),true);assert.equal(await s.kvPut('action',1,{status:'executing'}),false)}finally{db.close()}});
test('server rejects a forged approval with unsupported claims',async()=>{const db=openLocalDb(':memory:');try{const s=store(db),{workspace:w}=await s.get();w.successPlan={customerGoal:'Evaluate maintenance'};w.reviewedQbr={narrative:'We saved 100 hours.',approval:{source:qbrSource(w),narrative:'We saved 100 hours.',reviewer:'Reviewer',at:'2026-10-01'}};await assert.rejects(s.put(0,w,'user'),/approval/);assert.equal((await s.get()).revision,0)}finally{db.close()}});
