# Summarises the ledger for the human-readable report.
import json,sys,collections
L=json.load(open('/home/user/react-express-app/docs/audit/devshark-content-ledger.json'))
items=L['items']
by=collections.defaultdict(lambda: collections.Counter())
csby=collections.defaultdict(lambda: collections.Counter())
defects=collections.Counter(); blockers=collections.Counter(); reasons=collections.Counter()
rel_fail=collections.Counter(); q_fail=collections.Counter(); dims_low=collections.Counter()
orig_q=collections.Counter(); orig_r=collections.Counter()
for r in items:
    t=r['category']; by[t][r['decision']]+=1; by[t]['total']+=1
    csby[t][r['cs']['status']]+=1
    for d in r.get('defects',[]): 
        k=d.lower()
        key='generic hint' if 'generic' in k or 'fallback' in k else 'explanation thin' if 'explanation' in k else 'distractor/options' if ('distractor' in k or 'option' in k) else 'wording/assumption' if ('wording' in k or 'assum' in k or 'ambig' in k) else 'correctness' if ('incorrect' in k or 'wrong' in k or 'stale' in k or 'outdated' in k or 'version' in k) else 'other'
        defects[key]+=1
    if r.get('correctnessBlocker'): blockers[r['correctnessBlocker']]+=1
    if r['decision'] in ('retire','quarantine'): reasons[(t, r.get('retireReason') or '')]+=1
    o=r.get('original') or {'qualityScore':r['qualityScore'],'relevanceScore':r['relevanceScore'],'quality':r['quality']}
    orig_q[o['qualityScore']]+=1; orig_r[o['relevanceScore']]+=1
    for k,v in o['quality'].items():
        if v<=2: dims_low[k]+=1
print('BY TOPIC'); 
for t in sorted(by): print(t, dict(by[t]), 'cs', dict(csby[t]))
print('ORIGINAL QUALITY DIST', sorted(orig_q.items())); print('ORIGINAL RELEVANCE DIST', sorted(orig_r.items()))
print('DIMS <=2 (original)', dims_low.most_common())
print('DEFECTS', defects.most_common()); print('BLOCKERS', blockers.most_common())
print('RETIRE REASONS'); 
for (t,reason),n in sorted(reasons.items()): print(' ',t,n,reason)
tot=collections.Counter(r['decision'] for r in items); print('TOTAL', dict(tot), len(items))
