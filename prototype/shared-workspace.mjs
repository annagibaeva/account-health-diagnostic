export function sharedWorkspaceClient({fetcher=fetch,status=()=>{}}={}){
 let revision=null,blocked=false,queue=Promise.resolve();
 return {async load(){const r=await fetcher('/api/workspace');if(!r.ok)throw Error('Shared workspace unavailable. Reconnect and reload before editing.');const data=await r.json();revision=data.revision;blocked=false;status('Ready');return data.workspace},
 save(workspace){const snapshot=structuredClone(workspace);queue=queue.then(async()=>{if(blocked||revision===null)throw Error('Save blocked. Export your draft and reload the shared workspace.');status('Saving…');const r=await fetcher('/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,workspace:snapshot})});const data=await r.json();if(!r.ok){blocked=true;throw Error(data.error||'Save failed. Export your draft before reloading.')}revision=data.revision;status('Saved');return data}).catch(e=>{status(e.message+' Your draft remains in this session.');return null});return queue},
 get revision(){return revision}
 };
}
