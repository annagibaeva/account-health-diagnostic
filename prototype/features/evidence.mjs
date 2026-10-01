// Evidence snapshots travel with records so regenerated datasets never rewrite history.
export function evidenceFingerprint(e){return JSON.stringify(e ? [e.id,e.datasetVersion,e.team,e.metric,e.value,e.numerator,e.denominator,e.window,e.sourceRefs,e.eligible,e.completeness] : null)}
export function validEvidence(e){return !!e && typeof e.id==='string' && !!e.datasetVersion && Number.isFinite(e.value) && Number.isFinite(e.numerator) && e.numerator>=0 && Number.isFinite(e.denominator) && e.denominator>0 && e.numerator<=e.denominator && e.eligible===true && !!e.window?.start && !!e.window?.end && e.window.start<=e.window.end && Array.isArray(e.sourceRefs) && e.sourceRefs.length>0}
export function evidenceCurrent(e,catalog){return validEvidence(e)&&catalog?.records?.some(x=>x.id===e.id&&evidenceFingerprint(x)===evidenceFingerprint(e))===true}
export function evidenceLabel(e){return e ? `${e.id} · ${e.datasetVersion} · ${e.window?.start}–${e.window?.end} · ${e.numerator}/${e.denominator} = ${e.value??'unavailable'}${e.unit??''}` : 'No versioned telemetry linked'}
export function measurementKind(d){return d.outcomeEvidence ? 'telemetry' : 'manual'}
export function measurementMatches(d,e,kind='outcome'){return validEvidence(e)&&e.team===d.team&&e.unit===d.unit&&e.metric===d.metric&&e.value===(kind==='baseline'?d.baseline:d.actual)&&(kind==='baseline'||e.window.end===d.observed)}
export function linkMeasurement(d,e,kind='outcome'){
 if(!validEvidence(e)||e.team!==d.team)throw Error('Select eligible evidence for this team.');
 const next={...d,metric:e.metric,unit:e.unit};
 if(kind==='baseline'){next.baseline=e.value;next.baselineEvidence=structuredClone(e)}
 else {next.actual=e.value;next.observed=e.window.end;next.outcomeEvidence=structuredClone(e);next.measurementKind='telemetry';next.source='Synthetic SQL telemetry';next.evidence=evidenceLabel(e)+'; '+e.sourceRefs.join('; ')}
 return next;
}
export function reconcileEvidence(d){const next={...d};for(const [key,kind]of [['baselineEvidence','baseline'],['outcomeEvidence','outcome']])if(next[key]&&!measurementMatches(next,next[key],kind))delete next[key];next.measurementKind=measurementKind(next);return next}
export function recommendationEvidence(d,catalog){return (catalog?.records??[]).filter(e=>e.team===d.team&&e.period==='current').map(e=>structuredClone(e))}
export function comparableMeasurements(d){return !d.baselineEvidence||!d.outcomeEvidence||(measurementMatches(d,d.baselineEvidence,'baseline')&&measurementMatches(d,d.outcomeEvidence)&&d.baselineEvidence.window.end<d.outcomeEvidence.window.start)}
