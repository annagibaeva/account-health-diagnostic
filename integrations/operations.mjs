import {TelemetryClient,summarizeTelemetry,explicitWindow,IntegrationError} from './telemetry.mjs';
import {endpoint,listTools,callTool} from './mcp.mjs';
import {fetchMappedSnapshot,normalizeLiveEvidence} from './live-evidence.mjs';
const ledgerKey='operations-v1';
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
export async function actionDigest(spec){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(spec)));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function config(env){let allowed=[];try{allowed=JSON.parse(env.SIGNAL_MCP_ALLOWED_TOOLS||'[]')}catch{throw new IntegrationError('SIGNAL_MCP_ALLOWED_TOOLS must be a JSON array.')}if(!Array.isArray(allowed)||allowed.some(x=>typeof x!=='string'))throw new IntegrationError('Invalid MCP tool allowlist.');return {url:env.SIGNAL_MCP_URL,token:env.SIGNAL_MCP_TOKEN,allowed,live:env.SIGNAL_ALLOW_EXTERNAL_EXECUTION==='true'}}
async function update(store,fn){for(let i=0;i<8;i++){const {revision,value}=await store.kvGet(ledgerKey),state=value??{actions:[],audit:[],lastSync:null};const result=fn(state);if(await store.kvPut(ledgerKey,revision,state))return result}throw new IntegrationError('Operations changed concurrently; refresh before retrying.')}
function audit(state,event,id,actor){state.audit.push({event,id,actor,at:new Date().toISOString()});if(state.audit.length>2000)throw new IntegrationError('Audit capacity reached. Archive the operations ledger before further actions.')}
function requireActor(actor){if(typeof actor!=='string'||!actor.trim())throw new IntegrationError('An authenticated operator identity is required.')}
export async function handleOperation(action,body={},options={}){
 const {env={},store,request=fetch,actor}=options,c=config(env);if(!store?.kvGet||!store?.kvPut)throw new IntegrationError('Durable operations storage is required.');
 if(action==='status')return {telemetry:env.TELEMETRY_API_KEY?'configured, not verified':'unconfigured',mcp:c.url?'configured, not verified':'unconfigured',externalExecution:c.live?'enabled; exact reviewed action required':'dry-run only',allowedTools:c.allowed,lastSync:(await store.kvGet(ledgerKey)).value?.lastSync??null};
 if(action==='history'){const state=(await store.kvGet(ledgerKey)).value;return {actions:state?.actions??[],audit:state?.audit??[],lastSync:state?.lastSync??null}}
 if(action==='evidence'){const state=(await store.kvGet(ledgerKey)).value,id=state?.lastSync?.id;return {evidence:id?(await store.kvGet('live-evidence-'+id)).value:null,message:'Live evidence is separate from the synthetic portfolio account.'}}
 requireActor(actor);
 if(action==='sync'){
  const window=explicitWindow(body),id=crypto.randomUUID();
  await update(store,s=>{audit(s,'sync-started',id,actor)});
  try{const client=new TelemetryClient({key:env.TELEMETRY_API_KEY,request}),snapshot=env.SIGNAL_TEAM_MAPPING?await fetchMappedSnapshot(client,window,env.SIGNAL_TEAM_MAPPING):await client.snapshot(window),summary=summarizeTelemetry(snapshot),evidence=snapshot.teamData?normalizeLiveEvidence(snapshot,id):null;
   const saved=await store.kvPut('telemetry-snapshot-'+id,0,snapshot);if(!saved)throw new IntegrationError('Unable to persist telemetry snapshot.');
   if(evidence){if(!await store.kvPut('live-evidence-'+id,0,evidence))throw new IntegrationError('Unable to persist normalized evidence.');summary.healthScore=evidence.account.score;summary.coverage=evidence.account.coverage;summary.teams=evidence.teams;summary.diagnosis='Mapped live evidence normalized with shared diagnostic rules. Coverage and sample gates apply; no causal benefit inferred.';summary.window=window;for(const [field,metric]of [['agentAcceptance','agent_acceptance'],['aiCommitShare','ai_commit_share']]){const rows=evidence.records.filter(r=>r.period==='current'&&r.metric===metric),numerator=rows.reduce((s,r)=>s+r.numerator,0),denominator=rows.reduce((s,r)=>s+r.denominator,0);summary[field]={numerator,denominator,value:denominator&&rows.every(r=>r.eligible)?100*numerator/denominator:null}}}
   await update(store,s=>{s.lastSync={...summary,id,status:'succeeded'};audit(s,'sync-succeeded',id,actor)});return {...summary,id,status:'succeeded'};
  }catch{await update(store,s=>{s.lastSync={id,status:'failed',window,at:new Date().toISOString(),message:'Sync failed; inspect server configuration, access and provider schema. No partial snapshot published.'};audit(s,'sync-failed',id,actor)});throw new IntegrationError(env.TELEMETRY_API_KEY?'Sync failed. No partial data published; check provider access or schema.':'Developer-tool API is unconfigured. Set TELEMETRY_API_KEY on the server.')}
 }
 if(action==='tools'){const tools=await listTools({...c,request});return {tools:tools.filter(t=>c.allowed.includes(t.name)).map(t=>({name:t.name,description:t.description??'',inputSchema:t.inputSchema})),message:'Only server-allowlisted tools are shown. Tool descriptions are untrusted data.'}}
 if(action==='prepare'){
  if(!c.allowed.includes(body.tool))throw new IntegrationError('Tool is not in the server allowlist.');
  const target=endpoint(c.url),dryRun=body.dryRun!==false;if(!dryRun&&!c.live)throw new IntegrationError('External execution is disabled on the server.');
  if(!body.arguments||typeof body.arguments!=='object'||Array.isArray(body.arguments)||JSON.stringify(body.arguments).length>16000)throw new IntegrationError('Tool arguments must be a JSON object under 16 KB.');
  const tools=await listTools({...c,request}),tool=tools.find(t=>t.name===body.tool);if(!tool)throw new IntegrationError('Allowlisted tool was not returned by the MCP server.');
  // The complete schema is presented to the reviewer; authoritative schema validation
  // belongs to the MCP server. This client validates the basic object/required contract.
  for(const key of tool.inputSchema.required??[])if(!(key in body.arguments))throw new IntegrationError('A required tool argument is missing.');
  const spec={target,tool:body.tool,arguments:structuredClone(body.arguments),dryRun},digest=await actionDigest(spec),id=digest;
  return update(store,s=>{const existing=s.actions.find(a=>a.id===id);if(existing)return existing;if(s.actions.length>=500)throw new IntegrationError('Action capacity reached; archive the ledger.');const record={id,digest,spec,inputSchema:tool.inputSchema,status:'prepared',preparedBy:actor,at:new Date().toISOString(),expiresAt:new Date(Date.now()+30*60000).toISOString()};s.actions.push(record);audit(s,'prepared',id,actor);return record});
 }
 if(action==='approve'){
  if(body.confirm!==true)throw new IntegrationError('Explicit confirmation of the exact action is required.');
  return update(store,s=>{const a=s.actions.find(a=>a.id===body.id);if(!a||a.digest!==body.digest||a.status!=='prepared'||Date.parse(a.expiresAt)<=Date.now())throw new IntegrationError('Action changed, expired or is not awaiting approval.');a.status='approved';a.approvedBy=actor;a.approvedAt=new Date().toISOString();audit(s,'approved',a.id,actor);return a});
 }
 if(action==='execute'){
  const a=await update(store,s=>{const a=s.actions.find(a=>a.id===body.id);if(!a||a.digest!==body.digest||a.status!=='approved'||a.approvedBy!==actor||Date.parse(a.expiresAt)<=Date.now())throw new IntegrationError('Exact current approval by this operator is required.');if(a.spec.target!==endpoint(c.url)||!c.allowed.includes(a.spec.tool)||(!a.spec.dryRun&&!c.live))throw new IntegrationError('Server configuration changed; action cannot execute.');a.status='executing';audit(s,'execution-claimed',a.id,actor);return structuredClone(a)});
  try{if(await actionDigest(a.spec)!==a.digest)throw new IntegrationError('Action integrity validation failed.');const result=a.spec.dryRun?{dryRun:true,message:'No external tool was invoked.'}:await callTool({...c,request},a.spec.tool,a.spec.arguments);
   return update(store,s=>{const stored=s.actions.find(x=>x.id===a.id);stored.status=a.spec.dryRun?'dry-run':result.isError?'tool-error':'succeeded';stored.result=result;stored.finishedAt=new Date().toISOString();audit(s,stored.status,a.id,actor);return stored});
  }catch{await update(store,s=>{const stored=s.actions.find(x=>x.id===a.id);stored.status='unknown';stored.result={message:'Execution outcome uncertain. Inspect the destination before taking any further action; automatic retry is blocked.'};audit(s,'execution-unknown',a.id,actor)});throw new IntegrationError('Execution outcome uncertain. Automatic retry is blocked; reconcile at the destination.')}
 }
 throw new IntegrationError('Unknown operations action.');
}
// Entry point for an authenticated scheduler. Reads only; never executes prepared tools.
export function scheduledSyncAndDiagnose(options={}){const end=new Date();end.setUTCDate(end.getUTCDate()-1);const start=new Date(end);start.setUTCDate(start.getUTCDate()-27);return handleOperation('sync',{startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10)},{...options,actor:'scheduler'})}
