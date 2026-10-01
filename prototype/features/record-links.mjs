export function parseLinks(text='') {
  return String(text).split('\n').map(line=>{const parts=line.split('|');const raw=parts.length>1?parts.pop().trim():line.trim();try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)return null;return {label:parts.join('|').trim()||url.hostname,url:url.href}}catch{return null}}).filter(Boolean);
}
export function recordLinks(node,record={}) {
  const box=node('div','','record-links'),links=parseLinks(record.links);
  box.append(node('div','Linked work & conversations','eyebrow'));
  for(const link of links){const a=node('a',link.label+' ↗','action');a.href=link.url;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}
  if(!links.length)box.append(node('p','No source links recorded. Add PRs, conversations, screenshots or agent-run URLs when editing this record.','small'));
  if(record.slackUserId||record.slackChannel)box.append(node('p',`Notification routing: ${record.slackUserId||'recipient not set'} · ${record.slackChannel||'channel not set'}. Not sent: automatic notifications are not connected.`,'small'));
  return box;
}
