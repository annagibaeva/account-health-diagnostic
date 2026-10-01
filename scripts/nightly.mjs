import {mkdir,writeFile} from 'node:fs/promises';
import {openLocalDb} from '../hosting/local-db.mjs';
import {store} from '../hosting/store.mjs';
import {runWorkflow} from '../hosting/runtime.mjs';
import {scheduledSyncAndDiagnose} from '../integrations/operations.mjs';
await mkdir('output/nightly',{recursive:true});
const db=openLocalDb(),storage=store(db);
try{
 let live=null;
 if(process.env.TELEMETRY_API_KEY)live=await scheduledSyncAndDiagnose({env:process.env,store:storage});
 const offline=await runWorkflow(storage);
 const report={at:new Date().toISOString(),offline,live,notice:live?'Live results are kept separate from the synthetic portfolio run.':'No live credential configured. Fixed synthetic evidence only; this is not fresh customer telemetry.'};
 await writeFile('output/nightly/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({run:offline.id,source:offline.source,live:live?.status??'unconfigured',externalActions:'none'}));
}finally{db.close()}
