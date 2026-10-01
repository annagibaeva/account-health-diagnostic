import copy,json,sqlite3,unittest
import subprocess
from data.diagnostics import diagnose
from data.pipeline import generate,build,ROOT
class PipelineTests(unittest.TestCase):
    def evidence(self,b):return build(b,sqlite3.connect(':memory:'))
    def test_reproducible(self):
        a=self.evidence(generate());self.assertEqual(a,self.evidence(generate()));self.assertEqual(len(a['records']),36)
        self.assertEqual(a['teams'][1]['a'],48);self.assertEqual(a['teams'][1]['u'],82)
    def test_roster_window(self):
        b=generate();self.assertEqual(len(b['mapping']),400);self.assertEqual(len(b['responses']['team-1/dau.json']['data']),90)
    def test_missing_is_not_zero(self):
        b=generate();b['responses']['team-2/agent-edits.json']['data']=b['responses']['team-2/agent-edits.json']['data'][:-4]
        t=self.evidence(b)['teams'][1];self.assertIsNone(t['a']);self.assertFalse(t['valid'])
    def test_deduplication(self):
        b=generate();rows=b['responses']['team-1/agent-edits.json']['data'];rows.append(copy.deepcopy(rows[0]))
        e=self.evidence(b);self.assertEqual(e['quality']['duplicatesRemoved'],1);self.assertEqual(e['teams'][0]['a'],78)
    def test_invalid_attribution_quarantined(self):
        b=generate();b['responses']['commits-1.json']['items'][0]['tabLinesAdded']=100000
        self.assertEqual(len(self.evidence(b)['quality']['quarantined']),1)
    def test_published_is_current(self):self.assertEqual(self.evidence(generate()),json.loads((ROOT/'evidence.json').read_text()))
    def test_rule_parity(self):
        evidence=self.evidence(generate())
        js=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {teams,diagnose} from './prototype/diagnostic.mjs'; console.log(JSON.stringify(teams.map(t=>diagnose(t))))"],text=True))
        for team,result in zip(evidence['teams'],js):
            for key,value in diagnose(team).items():self.assertEqual(result[key],value)
if __name__=='__main__':unittest.main()
