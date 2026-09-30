import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python=process.env.SIGNAL_PYTHON||(existsSync(bundled)?bundled:'python');
let busy=false;
export function agentCall(command,snapshot){
  if(busy)return Promise.reject(new Error('Another agent operation is running. Try again shortly.'));
  busy=true;
  return new Promise((resolve,reject)=>{
    const child=execFile(python,[fileURLToPath(new URL('../agents/workflow.py',import.meta.url)),command],{timeout:30000,maxBuffer:2*1024*1024,windowsHide:true},(err,stdout)=>{
      busy=false;if(err)return reject(new Error('Agent service failed. Check SIGNAL_PYTHON and retry.'));
      try{resolve(JSON.parse(stdout))}catch{reject(new Error('Invalid agent service response.'))}
    });
    child.stdin.end(snapshot?JSON.stringify(snapshot):'');
  });
}
