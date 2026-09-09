# Summarises finished review fragments (before or after the second reading) for
# the human-readable report. Usage: python3 review-summary.py <reviewDir> [inventoryDir]
import json,glob,os,sys,collections
rev=sys.argv[1]; inv=sys.argv[2] if len(sys.argv)>2 else 'docs/audit/wip/inventory'
rows={}
for f in glob.glob(f'{rev}/*.jsonl'):
    for l in open(f):
        if l.strip(): r=json.loads(l); rows[r['id']]=r
for f in glob.glob(f'{rev}/*.json'):
    v=json.load(open(f))
    if isinstance(v,list):
        for r in v: rows[r['id']]=r
inv_items={}
for f in glob.glob(f'{inv}/batch-*.json'):
    for it in json.load(open(f)): inv_items[it['id']]=it
QD=['topicRelevance','learningValue','technicalCorrectness','wording','answerOptions','hint','explanation']
by=collections.defaultdict(collections.Counter); csby=collections.defaultdict(collections.Counter)
orig_q=collections.Counter(); orig_r=collections.Counter(); new_q=collections.Counter()
dims_low=collections.Counter(); blockers=collections.Counter(); verdicts=collections.Counter()
retires=[]; changed=collections.Counter()
for i,r in rows.items():
    it=inv_items.get(i); cat=it['category'] if it else '?'
    by[cat][r['decision']]+=1; by[cat]['total']+=1
    if r.get('cs'): csby[cat][r['cs']['status']]+=1
    orig_q[r['qualityScore']]+=1; orig_r[r['relevanceScore']]+=1
    for k in QD:
        if r['quality'][k]<=2: dims_low[k]+=1
    if r.get('correctnessBlocker'): blockers[r['correctnessBlocker']]+=1
    if r['decision']=='rewrite' and r.get('rewrite'):
        rs=r['rewrite'].get('rescored') or {}
        if rs.get('qualityScore'): new_q[rs['qualityScore']]+=1
        for k in ('question','options','correctAnswer','hint','explanation'):
            if k in r['rewrite']: changed[k]+=1
    if r['decision'] in ('retire','quarantine'): retires.append((cat,i,r['decision'],(r.get('retireReason') or '')[:110]))
    v=r.get('verification')
    if v: verdicts[v['verdict']]+=1
print('ROWS',len(rows))
print('BY CATEGORY (decision counts):')
for c in sorted(by): print(f'  {c:16}',dict(by[c]),'cs',dict(csby[c]))
print('DECISIONS',dict(collections.Counter(r["decision"] for r in rows.values())))
print('SECOND-READING VERDICTS',dict(verdicts))
print('QUALITY BEFORE',sorted(orig_q.items()),'AFTER(rewrites)',sorted(new_q.items()))
print('RELEVANCE BEFORE',sorted(orig_r.items()))
print('DIMENSIONS SCORING <=2',dims_low.most_common())
print('CORRECTNESS BLOCKERS',blockers.most_common())
print('FIELDS REWRITTEN',changed.most_common())
print('RETIRED/QUARANTINED',len(retires))
for c,i,d,why in sorted(retires): print(f'  {c:14} {i:16} {d:11} {why}')
