import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const executable=process.env.SIGNAL_PYTHON||(existsSync(bundled)?bundled:'python');
const result=spawnSync(executable,process.argv.slice(2),{stdio:'inherit',windowsHide:true});
if(result.error){console.error('Python could not start. Set SIGNAL_PYTHON to a Python 3.12+ executable.');process.exitCode=1}else process.exitCode=result.status??1;
