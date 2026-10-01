"""Rule thresholds shared with generated browser module."""
import json
from pathlib import Path
R=json.loads((Path(__file__).parent/'rules.json').read_text())
def diagnose(t):
    valid=t.get('valid',True) and t.get('a') is not None and t.get('u') is not None
    comparable=valid and t.get('comparable',True) and t.get('p') is not None
    score=R['acceptanceWeight']*t['a']+R['activeWeight']*t['u'] if valid else None
    delta=t['a']-t['p'] if comparable else None
    stalled=t['a']<R['stalledBelow'] and delta<=R['improvement'] if comparable else None
    declining=delta<=R['decline'] if comparable else None
    action=0 if not valid else 1 if t.get('c') is None else 2 if not comparable else (3 if t['u']>=R['highActive'] else 4) if stalled else 5 if declining else 6 if delta>R['improvement'] else 7 if score>=R['healthy'] else 8
    return dict(valid=valid,comparable=comparable,score=score,delta=delta,stalled=stalled,declining=declining,action=action)
