import {store} from './store.mjs';
import {runWorkflow} from './runtime.mjs';
import {evidence} from '../prototype/evidence-data.mjs';
import {handleOperation} from '../integrations/operations.mjs';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function api(request,env,{local=false}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return null;
 const actor=local?'local-operator':request.headers.get('oai-authenticated-user-id');
 if(!actor)return json({error:'Sign in to access the account workspace.'},401);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return json({error:'Same-origin request required'},403);
 try{const s=store(env.DB);
 if(url.pathname.startsWith('/api/operations/')&&request.method==='POST'){const text=await request.text();if(text.length>1500000)return json({error:'Request too large'},413);try{return json(await handleOperation(url.pathname.split('/').pop(),JSON.parse(text||'{}'),{env,store:s,actor}))}catch(e){return json({error:e.message},400)}}
 if(url.pathname==='/api/evidence'&&request.method==='GET')return json(evidence);
 if(url.pathname==='/api/workspace'&&request.method==='GET')return json(await s.get());
 if(url.pathname==='/api/workspace'&&request.method==='PUT'){const text=await request.text();if(text.length>1500000)return json({error:'Workspace too large'},413);const body=JSON.parse(text);if(!Number.isSafeInteger(body.revision)||body.revision<0)return json({error:'Revision required'},400);let saved;try{saved=await s.put(body.revision,body.workspace,actor)}catch(e){return json({error:e.message},400)}return saved?json(saved):json({error:'Another session saved changes. Export your draft, then reload before retrying.'},409)}
 if(url.pathname==='/api/agents/history'&&request.method==='POST')return json(await s.history());
 if(url.pathname==='/api/agents/run'&&request.method==='POST')return json(await runWorkflow(s));
 return json({error:'Endpoint unavailable in this runtime'},404);
 }catch(e){console.error('Account storage error',e.message);return json({error:'Shared storage unavailable; your unsaved input remains in this session.'},503)}
}
export default {async fetch(request,env){return await api(request,env)??env.ASSETS.fetch(request)}};
