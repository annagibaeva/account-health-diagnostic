"""Documented response fixtures -> validated SQLite -> traceable evidence. Stdlib only."""
import argparse, hashlib, json, random, sqlite3
from datetime import date, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parent
class FixtureClient:
    """Response adapter seam: replace get(path) with a provider transport."""
    def __init__(self,responses): self.responses=responses
    def get(self,path): return self.responses[path]

RULES=json.loads((ROOT/'rules.json').read_text())
TEAMS=[('Digital Channels',90,78,73,84,43),('Payments',80,48,64,82,32),('Core Banking',85,35,34,36,14),('Risk & Compliance',55,52,46,44,18),('Data Platform',50,70,60,72,39),('Developer Platform',40,76,74,88,None)]
START=date(2026,7,1)
def dump(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
def generate(seed=42):
    rng=random.Random(seed); members=[]; mapping={}; responses={}; commits=[]
    for ti,(name,size,a,p,u,c) in enumerate(TEAMS,1):
        users=[]
        for i in range(size):
            uid=f'user_{ti}_{i:03}'; users.append(uid); mapping[uid]=name
            members.append(dict(id=uid,name=f'Engineer {len(members)+1:03}',email=f'{uid}@example.invalid',role='member',isRemoved=False))
        edits=[]; dau=[]
        for offset in range(90):
            day=START+timedelta(days=offset); ds=day.isoformat(); working=day.weekday()<5
            suggested=100+rng.randrange(4)*100 if working else 0
            accepted=suggested*(a if offset>=62 else p)//100
            rejected=suggested-accepted
            edits.append(dict(event_date=ds,total_suggested_diffs=suggested,total_accepted_diffs=accepted,total_rejected_diffs=rejected,total_green_lines_accepted=accepted*5,total_red_lines_accepted=accepted,total_green_lines_rejected=rejected*5,total_red_lines_rejected=rejected,total_green_lines_suggested=suggested*5,total_red_lines_suggested=suggested,total_lines_suggested=suggested*6,total_lines_accepted=accepted*6))
            # Rotate the integer remainder so 20 working days have the intended ratio of sums.
            wi=sum((START+timedelta(days=k)).weekday()<5 for k in range(offset+1))-1
            active=((wi+1)*size*u//100-wi*size*u//100) if working else 0
            dau.append(dict(date=ds,dau=active,cli_dau=0,cloud_agent_dau=0,bugbot_dau=0))
            if working and c is not None:
                uid=users[offset%size]; total=100+rng.randrange(5)*100; ai=total*c//100
                commits.append(dict(commitHash=hashlib.sha1(f'{seed}/{ti}/{ds}'.encode()).hexdigest(),userId=uid,userEmail=f'{uid}@example.invalid',repoName=f'example/team-{ti}',branchName='main',isPrimaryBranch=True,commitSource='ide',totalLinesAdded=total,totalLinesDeleted=20,tabLinesAdded=ai//3,tabLinesDeleted=0,composerLinesAdded=ai-ai//3,composerLinesDeleted=0,nonAiLinesAdded=total-ai,nonAiLinesDeleted=20,message='Synthetic maintenance',commitTs=ds+'T12:00:00Z',createdAt=ds+'T12:01:00Z'))
        for metric,rows in [('agent-edits',edits),('dau',dau)]:
            responses[f'team-{ti}/{metric}.json']={'data':rows,'params':{'metric':metric,'teamId':12345,'startDate':'2026-07-01','endDate':'2026-09-28'}}
    responses['members.json']={'teamMembers':members}
    for page,start in enumerate(range(0,len(commits),100),1):
        responses[f'commits-{page}.json']={'items':commits[start:start+100],'totalCount':len(commits),'page':page,'pageSize':100}
    return {'seed':seed,'mapping':mapping,'responses':responses,'manifest':{'days':90,'expectedTeamDays':540,'teamFilters':{f'team-{i}':[u for u,t in mapping.items() if t==team[0]] for i,team in enumerate(TEAMS,1)}}}

def count(value):
    if type(value) is not int or value<0: raise ValueError('Expected nonnegative integer')
    return value
def normalize(bundle,db):
    db.executescript('CREATE TABLE daily(team TEXT,day TEXT,working INT,suggested INT,accepted INT,active INT,PRIMARY KEY(team,day)); CREATE TABLE commits(repo TEXT,hash TEXT,team TEXT,day TEXT,ai INT,total INT,source TEXT,PRIMARY KEY(repo,hash));')
    issues=[]; duplicates=0
    members=bundle['responses']['members.json']['teamMembers']
    if len({m['id'] for m in members})!=400 or len(members)!=400: raise ValueError('Expected 400 unique members')
    for m in members:
        if not all(isinstance(m.get(k),str) for k in ('id','email','name','role')) or type(m.get('isRemoved')) is not bool: raise ValueError('Invalid member response')
    client=FixtureClient(bundle['responses'])
    for ti,(name,size,*_) in enumerate(TEAMS,1):
        bydate={}
        for metric in ('dau','agent-edits'):
            response=client.get(f'team-{ti}/{metric}.json')
            if not isinstance(response.get('data'),list) or response.get('params',{}).get('metric')!=metric: raise ValueError('Invalid Analytics envelope')
        for r in client.get(f'team-{ti}/dau.json')['data']:
            if r['date'] in bydate: duplicates+=1
            if r['date'] in bydate and bydate[r['date']]!=r: raise ValueError('Conflicting DAU duplicate')
            bydate[r['date']]=r
        seen={}
        for r in bundle['responses'][f'team-{ti}/agent-edits.json']['data']:
            ds=r['event_date']
            if ds in seen:
                duplicates+=1
                if seen[ds]!=r: raise ValueError('Conflicting edit duplicate')
                continue
            seen[ds]=r
            try:
                day=date.fromisoformat(ds); s=count(r['total_suggested_diffs']); a=count(r['total_accepted_diffs']); active=count(bydate[ds]['dau'])
                if a>s or active>size or a+count(r['total_rejected_diffs'])!=s or not START<=day<=START+timedelta(days=89): raise ValueError('Invalid daily counts/date')
                db.execute('INSERT INTO daily VALUES(?,?,?,?,?,?)',(name,ds,int(day.weekday()<5),s,a,active))
            except (ValueError,KeyError) as exc: issues.append({'source':f'team-{ti}/agent-edits.json#{ds}','reason':str(exc)})
    seen={}
    for key,response in bundle['responses'].items():
        if not key.startswith('commits-'): continue
        for r in response['items']:
            identity=(r['repoName'],r['commitHash'])
            if identity in seen:
                duplicates+=1
                if seen[identity]!=r: raise ValueError('Conflicting commit duplicate')
                continue
            seen[identity]=r
            try:
                total=count(r['totalLinesAdded']); ai=count(r['tabLinesAdded'])+count(r['composerLinesAdded'])
                if ai>total or ai+count(r['nonAiLinesAdded'])!=total: raise ValueError('Invalid attribution')
                db.execute('INSERT INTO commits VALUES(?,?,?,?,?,?,?)',(r['repoName'],r['commitHash'],bundle['mapping'][r['userId']],r['commitTs'][:10],ai,total,key+'#'+r['commitHash']))
            except (KeyError,ValueError) as exc: issues.append({'source':key+'#'+r['commitHash'],'reason':str(exc)})
    return issues,duplicates

def build(bundle,db):
    issues,duplicates=normalize(bundle,db)
    version=hashlib.sha256(json.dumps(bundle,sort_keys=True).encode()).hexdigest()[:16]
    result={'version':1,'run_id':'offline-'+version,'datasetVersion':version,'rulesVersion':RULES['version'],'source':'synthetic','window':{'start':'2026-07-01','end':'2026-09-28'},'teams':[],'records':[],'quality':{'quarantined':issues,'duplicatesRemoved':duplicates},'limitations':['Synthetic observations; no causal productivity inference.','Monday-Friday calendar; no holiday adjustments.','Commit attribution covers tracked commits only; repository coverage unknown.']}
    for ti,(name,size,*_) in enumerate(TEAMS,1):
        team={'name':name,'size':size,'evidence_ids':[]}
        for period,start,end in [('prior','2026-08-04','2026-08-31'),('current','2026-09-01','2026-09-28')]:
            days,suggested,accepted,active,working=db.execute((ROOT/'metrics.sql').read_text(),(name,start,end)).fetchone()
            complete=days/28; eligible=suggested>=RULES['minSuggested'] and (working or 0)>=RULES['minWorkingDays'] and complete>=RULES['minCompleteness']
            ai,total=db.execute('SELECT COALESCE(SUM(ai),0),COALESCE(SUM(total),0) FROM commits WHERE team=? AND day BETWEEN ? AND ?',(name,start,end)).fetchone()
            for metric,n,d,ok,source in [('agent_acceptance',accepted,suggested,eligible,f'team-{ti}/agent-edits.json'),('active_share',active,size*(working or 0),eligible,f'team-{ti}/dau.json'),('ai_commit_share',ai,total,total>0,'commits-*.json')]:
                value=100*n/d if d and ok else None; eid=f'EV-{ti}-{period}-{metric}'
                record=dict(id=eid,team=name,metric=metric,unit='%',value=value,numerator=n,denominator=d,window={'start':start,'end':end},period=period,sourceRefs=[f'data/generated/fixtures/{source}',f'SQL:{metric};team={name};start={start};end={end}'],datasetVersion=version,eligible=bool(ok),completeness=complete)
                if metric=='ai_commit_share':
                    record['sourceRefs']=[f'data/generated/fixtures/{r[0]}' for r in db.execute('SELECT source FROM commits WHERE team=? AND day BETWEEN ? AND ? ORDER BY source',(name,start,end))]
                result['records'].append(record); team['evidence_ids'].append(eid)
                if metric=='agent_acceptance': team['a' if period=='current' else 'p']=value
                if period=='current' and metric!='agent_acceptance': team['u' if metric=='active_share' else 'c']=value
            team['valid' if period=='current' else 'comparable']=eligible
        result['teams'].append(team)
    return result

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--seed',type=int,default=42); parser.add_argument('--output',type=Path,default=ROOT/'generated'); parser.add_argument('--publish',action='store_true'); args=parser.parse_args()
    bundle=generate(args.seed); args.output.mkdir(parents=True,exist_ok=True)
    for name,response in bundle['responses'].items(): dump(args.output/'fixtures'/name,response)
    dump(args.output/'manifest.json',{**bundle['manifest'],'mapping':bundle['mapping'],'seed':args.seed})
    path=args.output/'analytics.sqlite'
    if path.exists(): path.unlink()
    with sqlite3.connect(path) as db: evidence=build(bundle,db)
    dump(args.output/'evidence.json',evidence)
    if args.publish:
        dump(ROOT/'evidence.json',evidence)
        (ROOT.parent/'prototype'/'evidence-data.mjs').write_text('// Generated by python -m data.pipeline --publish\nexport const evidence = '+json.dumps(evidence)+';\nexport const rules = '+json.dumps(RULES)+';\n',encoding='utf-8')
    print(json.dumps({'run_id':evidence['run_id'],'members':400,'days':90,'records':len(evidence['records']),'quarantined':len(evidence['quality']['quarantined'])}))
if __name__=='__main__': main()
