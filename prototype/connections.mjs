export async function testCursor({key=process.env.TELEMETRY_API_KEY ?? process.env.CURSOR_API_KEY,request=fetch}={}) {
  if(!key)return {ok:false,message:'Set TELEMETRY_API_KEY on the server, restart, then test again. Enterprise access required.'};
  const r=await request('https://api.cursor.com/teams/members',{headers:{Authorization:'Basic '+Buffer.from(key+':').toString('base64')},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok)return {ok:false,message:`Provider returned HTTP ${r.status}. Check the key, permissions and Enterprise access.`};
  const data=await r.json();if(!Array.isArray(data.teamMembers))return {ok:false,message:'Unexpected member response; connection not verified.'};
  return {ok:true,message:`Admin API verified (${data.teamMembers.length} members). Analytics and Code Tracking are not tested. Demo data is unchanged.`};
}
export async function testMcp({url=process.env.SIGNAL_MCP_URL,token=process.env.SIGNAL_MCP_TOKEN,request=fetch}={}) {
  if(!url)return {ok:false,message:'Set SIGNAL_MCP_URL on the server to an authorized HTTPS Streamable HTTP endpoint, then restart.'};
  const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.hash||parsed.search)return {ok:false,message:'MCP URL must use HTTPS without credentials, query parameters or fragments.'};
  const headers={'Content-Type':'application/json',Accept:'application/json, text/event-stream'};if(token)headers.Authorization='Bearer '+token;
  const r=await request(url,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'signal-connection-check',version:'0.1.0'}}}),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok)return {ok:false,message:`MCP returned HTTP ${r.status}. Check endpoint and server-side bearer credentials. OAuth setup is not supported yet.`};
  // Limited connectivity probe: JSON initialization responses only, no tool execution.
  if(!(r.headers.get('content-type')??'').includes('application/json')){await r.body?.cancel();return {ok:false,message:'This probe supports JSON initialization responses only. The server returned a streaming response; use an MCP SDK adapter for this server.'};}
  const body=await r.json();if(body.id!==1||body.error||body.result?.protocolVersion!=='2025-06-18'||!body.result?.serverInfo)return {ok:false,message:'MCP initialization response could not be verified for protocol 2025-06-18.'};
  const session=r.headers.get('mcp-session-id');
  const nextHeaders={...headers,'MCP-Protocol-Version':'2025-06-18'};if(session)nextHeaders['Mcp-Session-Id']=session;
  const ready=await request(url,{method:'POST',headers:nextHeaders,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'}),redirect:'error',signal:AbortSignal.timeout(15000)});
  await ready.body?.cancel();
  if(!ready.ok)return {ok:false,message:'MCP initialization notification was rejected.'};
  if(session){try{const close=await request(url,{method:'DELETE',headers:nextHeaders,redirect:'error',signal:AbortSignal.timeout(5000)});await close.body?.cancel()}catch{}}
  return {ok:true,message:'MCP handshake verified. No tools executed, records imported, or ongoing session retained.'};
}
