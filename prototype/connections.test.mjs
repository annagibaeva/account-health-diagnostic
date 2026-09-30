import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testCursor,testMcp} from './connections.mjs';
test('missing credentials do not call a provider',async()=>{const request=()=>{throw Error('must not call')};assert.equal((await testCursor({key:'',request})).ok,false);assert.equal((await testMcp({url:'',request})).ok,false)});
test('Cursor member response is checked without returning identities',async()=>{const r=await testCursor({key:'test',request:async(url,opts)=>{assert.equal(url,'https://api.cursor.com/teams/members');assert.equal(opts.redirect,'error');return {ok:true,json:async()=>({teamMembers:[{email:'private@example.test'}]})}}});assert.equal(r.ok,true);assert(!JSON.stringify(r).includes('private@'))});
test('HTTP errors are not reported as connected',async()=>{assert.equal((await testCursor({key:'test',request:async()=>({ok:false,status:403})})).ok,false)});
test('MCP rejects insecure URL',async()=>{assert.equal((await testMcp({url:'http://example.test'})).ok,false)});
test('MCP initializes without calling tools',async()=>{const methods=[];const request=async(url,o)=>{methods.push(o.method==='DELETE'?'DELETE':JSON.parse(o.body).method);return {ok:true,headers:new Headers({'content-type':'application/json','mcp-session-id':'test-session'}),json:async()=>({id:1,result:{protocolVersion:'2025-06-18',serverInfo:{name:'test'}}})}};assert.equal((await testMcp({url:'https://example.test/mcp',request})).ok,true);assert.deepEqual(methods,['initialize','notifications/initialized','DELETE'])});
