import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const files=[];
function collect(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory()&&!['node_modules','state','generated','__pycache__'].includes(entry.name))collect(path);else if(entry.isFile()&&entry.name.endsWith('.test.mjs'))files.push(path)}}
for(const dir of ['prototype','hosting','integrations']){try{collect(dir)}catch(e){if(e.code!=='ENOENT')throw e}}
const result=spawnSync(process.execPath,['--test',...files.sort()],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
process.exitCode=result.status??1;
