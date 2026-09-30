"""Three-stage account workflow. Offline by default; persists runs and local tasks."""
import argparse
import hashlib
import json
import math
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = ROOT / 'state' / 'workflow.sqlite'

def connect(path=DB):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.executescript('''
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, at TEXT, status TEXT, snapshot TEXT, result TEXT);
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, run_id TEXT, payload TEXT);
    ''')
    return db

def validate(snapshot):
    if snapshot.get('source') != 'synthetic':
        raise ValueError('Only the synthetic snapshot adapter is enabled.')
    if snapshot.get('account') != 'straits-meridian':
        raise ValueError('Unknown account mapping.')
    rows = snapshot.get('teams')
    if not isinstance(rows, list) or len(rows) != 6:
        raise ValueError('Expected six teams.')
    for t in rows:
        if not isinstance(t.get('name'), str):
            raise ValueError('Missing team identity.')
        for k in ['a', 'p', 'u']:
            if not isinstance(t.get(k), (int, float)) or not math.isfinite(t[k]) or not 0 <= t[k] <= 100:
                raise ValueError('Invalid percentage.')
        if not isinstance(t.get('size'), int) or t['size'] <= 0:
            raise ValueError('Invalid headcount.')
    if sum(t['size'] for t in rows) != 400 or len({t['name'] for t in rows}) != 6:
        raise ValueError('Invalid roster.')

class TriageAgent:
    name = 'Customer triage'
    def run(self, snapshot):
        validate(snapshot)
        rows = []
        for t in snapshot['teams']:
            rows.append({**t, 'score': round(.7*t['a']+.3*t['u'], 1),
                         'delta': t['a']-t['p'], 'stalled': t['a']<55 and t['a']-t['p']<=2,
                         'evidence_id': 'analytics:' + t['name'], 'tracking_gap': t.get('c') is None})
        score = sum((.7*t['a']+.3*t['u'])*t['size'] for t in rows)/400
        deployments = snapshot.get('workspace', {}).get('deployments', [])
        feedback = snapshot.get('workspace', {}).get('feedback', [])
        blocked = sum(d.get('status')=='Blocked' for d in deployments if isinstance(d, dict))
        summary = f"Synthetic adoption signal {score:.1f}/100; {sum(t['stalled'] for t in rows)} teams warrant stalled-acceptance investigation; {sum(t['tracking_gap'] for t in rows)} tracking gap; {blocked} blocked interventions."
        return {'name': self.name, 'summary': summary, 'teams': rows, 'account_score': round(score, 1),
                'blocked_interventions': blocked, 'feedback_count': len(feedback),
                'limitations': ['Fixed synthetic observation window ends 2026-09-28; this is not new daily telemetry.',
                    'Analytics completeness is assumed by this fixture adapter, not checked against raw API responses.',
                    'Browser edits are included only after Run workflow submits a new snapshot.',
                    'Adoption score is a heuristic; no causal productivity or renewal prediction.']}

class SolutionAgent:
    name = 'Decision and solutions'
    def run(self, triage):
        plans = []
        for t in triage['teams']:
            if t['stalled']:
                rule = 'rejected-edit-review' if t['u'] >= 70 else 'bounded-pilot'
                action = 'Review rejected edits and task fit with the champion.' if t['u'] >= 70 else 'Run a bounded legacy-code pilot with a champion.'
            elif t['delta'] <= -10:
                rule, action = 'workflow-review', 'Review workflow changes and repository context.'
            elif t['delta'] > 2:
                rule, action = 'staged-expansion', 'Assess suitability before expanding an adjacent workflow.'
            else:
                rule, action = 'practice-review', 'Review successful practices and remaining adoption barriers.'
            plans.append({'team':t['name'], 'rule':rule, 'kind':'customer_intervention', 'action':action,
                'why':f"Acceptance {t['a']}%, change {t['delta']:+} points, active share {t['u']}%.",
                'evidence_id':t['evidence_id'], 'baseline':t['a'], 'metric':'Agent diff acceptance',
                'success_criterion':'Agree a target with the team lead and compare eligible windows; check review rework.',
                'target':None, 'quality':'Not assessed'})
            if t['tracking_gap']:
                plans.append({'team':t['name'], 'rule':'tracking-repair', 'kind':'measurement_repair',
                    'action':'Verify attribution against an independently agreed repository sample.',
                    'why':'Contribution evidence is unavailable; adoption evidence remains separate.',
                    'evidence_id':'tracking:'+t['name'], 'baseline':None, 'metric':'Verified tracking coverage',
                    'success_criterion':'Agree an inventory denominator and coverage target before evaluating.',
                    'target':None, 'quality':'Not assessed'})
        return {'name':self.name, 'plans':plans, 'policy':'Targets require customer agreement. Measurement repair does not hide customer interventions.'}

class ExecutionAgent:
    name = 'Internal execution'
    def run(self, db, run_id, account, plans):
        result=[]
        for p in plans:
            # Stable across repeated runs: never overwrite human edits or duplicate a task.
            task_id=hashlib.sha256(f"{account}:{p['team']}:{p['rule']}".encode()).hexdigest()[:20]
            task={**p,'id':task_id,'account':account,'status':'Draft — target agreement required',
                  'owner':'Deployment manager / '+p['team']+' lead','actual':None,
                  'external_action':'Not authorized or implemented','created_by':self.name}
            cursor=db.execute('INSERT OR IGNORE INTO tasks VALUES (?,?,?)',(task_id,run_id,json.dumps(task)))
            result.append({'id':task_id,'team':p['team'],'action':p['action'], 'result':'Created local draft' if cursor.rowcount else 'Existing draft retained'})
        return {'name':self.name,'actions':result,'policy':'Only local draft tasks can be created. No external messages, CRM writes, code changes or MCP tools.'}

def run(snapshot, db_path=DB, model_assisted=False):
    db=connect(db_path)
    run_id=str(uuid.uuid4()); at=datetime.now(timezone.utc).isoformat()
    result={'id':run_id,'at':at,'source':'synthetic','mode':'model-assisted' if model_assisted else 'deterministic offline', 'stages':[]}
    try:
        db.execute('BEGIN IMMEDIATE')
        triage=TriageAgent().run(snapshot); result['stages'].append(triage)
        plans=SolutionAgent().run(triage); result['stages'].append(plans)
        if model_assisted:
            from model_agents import narrate
            result['model_review']=narrate(triage, plans)
        execution=ExecutionAgent().run(db,run_id,snapshot['account'],plans['plans']); result['stages'].append(execution)
        result['status']='complete'
        result['snapshot_hash']=hashlib.sha256(json.dumps(snapshot,sort_keys=True).encode()).hexdigest()
        db.execute('INSERT INTO runs VALUES (?,?,?,?,?)',(run_id,at,'complete',json.dumps(snapshot),json.dumps(result)))
        db.commit()
    except Exception as exc:
        db.rollback();result['status']='failed';result['error']=type(exc).__name__+': workflow failed; no tasks committed.'
        db.execute('INSERT INTO runs VALUES (?,?,?,?,?)',(run_id,at,'failed',json.dumps(snapshot),json.dumps(result)));db.commit()
    finally:
        db.close()
    return result

def history(db_path=DB):
    db=connect(db_path)
    result={'runs':[json.loads(r['result']) for r in db.execute('SELECT result FROM runs ORDER BY at DESC LIMIT 20')],
            'tasks':[json.loads(r['payload']) for r in db.execute('SELECT payload FROM tasks ORDER BY rowid DESC')]}
    db.close();return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('command',choices=['run','history','nightly']);parser.add_argument('--model-assisted',action='store_true');args=parser.parse_args()
    if args.command=='history': result=history()
    else:
        if args.command=='nightly':
            db=connect(); row=db.execute("SELECT snapshot FROM runs WHERE status='complete' ORDER BY at DESC LIMIT 1").fetchone();db.close()
            if not row: print(json.dumps({'status':'failed','error':'Run once from the UI to save an account snapshot.'}));return
            snapshot=json.loads(row['snapshot'])
        else: snapshot=json.load(sys.stdin)
        result=run(snapshot,model_assisted=args.model_assisted)
    print(json.dumps(result))
if __name__=='__main__':main()
