import http from 'node:http';
import { readFile } from 'node:fs/promises';
import {testCursor,testMcp} from './connections.mjs';
import {agentCall} from './agent-bridge.mjs';
import {teams} from './diagnostic.mjs';
const routes = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/styles.css', 'styles.css'], ['/app.js', 'app.js'], ['/diagnostic.mjs', 'diagnostic.mjs'], ['/sketch.html', 'sketch.html']]);
for(const name of ['success-plan','action-inbox','reproduction-packet','outcome-review','reviewed-qbr'])routes.set('/features/'+name+'.mjs','features/'+name+'.mjs');
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript' };
http.createServer(async (req, res) => {
  if(req.url==='/api/agents/run'||req.url==='/api/agents/history'){
    if(req.method!=='POST'||!['http://127.0.0.1:4173','http://localhost:4173'].includes(req.headers.origin)||!['127.0.0.1:4173','localhost:4173'].includes(req.headers.host)){res.writeHead(403);return res.end('Forbidden')}
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    try{let input='';for await(const chunk of req){input+=chunk;if(input.length>200000){res.writeHead(413);return res.end(JSON.stringify({error:'Snapshot too large'}))}}
      const body=input?JSON.parse(input):{};
      const snapshot={account:'straits-meridian',source:'synthetic',window_end:'2026-09-28',teams,workspace:body.workspace??{}};
      const result=await agentCall(req.url.endsWith('/run')?'run':'history',snapshot);return res.end(JSON.stringify(result));
    }catch(e){res.statusCode=500;return res.end(JSON.stringify({error:e.message}))}
  }
  if(req.url==='/api/connections/test'){
    const origin=req.headers.origin;
    if(req.method!=='POST'||!['http://127.0.0.1:4173','http://localhost:4173'].includes(origin)||!['127.0.0.1:4173','localhost:4173'].includes(req.headers.host)) {res.writeHead(403);return res.end('Forbidden');}
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    try{let input='';for await(const chunk of req){input+=chunk;if(input.length>1024){res.writeHead(413);return res.end(JSON.stringify({ok:false,message:'Request too large'}))}}const {provider}=JSON.parse(input);const result=provider==='cursor'?await testCursor():provider==='mcp'?await testMcp():{ok:false,message:'Provider not supported'};return res.end(JSON.stringify(result));}catch{res.statusCode=502;return res.end(JSON.stringify({ok:false,message:'Connection check failed or timed out. Verify server configuration and network access.'}))}
  }
  const name = routes.get(new URL(req.url, 'http://localhost').pathname);
  if (!name) { res.writeHead(404); return res.end('Not found'); }
  try {
    const body = await readFile(new URL(name, import.meta.url));
    res.writeHead(200, { 'Content-Type': `${types[name.split('.').pop()]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Unable to load prototype'); }
}).listen(4173, '127.0.0.1', () => console.log('Signal: http://127.0.0.1:4173 — sketch: /sketch.html'));
