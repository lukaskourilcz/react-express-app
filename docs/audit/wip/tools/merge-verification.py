# Folds the second reading (verify-out/*.jsonl) and the cross-batch duplicate
# decisions into the review fragments, writing one final JSON Lines file per
# batch under <outDir>. The originals are never modified. Usage:
#   python3 merge-verification.py <reviewDir> <verifyDir> <outDir>
import json,glob,os,sys,copy
rev_dir, ver_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
verify = {}; dups = []
for f in glob.glob(f'{ver_dir}/verify-*.jsonl'):
    for l in open(f):
        if not l.strip(): continue
        r = json.loads(l)
        if 'pair' in r: dups.append(r)
        else:
            if r['id'] in verify: print('WARNING duplicate verification row', r['id'])
            verify[r['id']] = r
retire_by_dup = {}
for d in dups:
    if d['verdict'] == 'retire' and d.get('retire'):
        survivor = [i for i in d['pair'] if i != d['retire']][0]
        retire_by_dup[d['retire']] = (survivor, d['reason'])
FIELDS = ('question', 'options', 'correctAnswer', 'hint', 'explanation')
stats = {'accept': 0, 'amend': 0, 'reject': 0, 'dup-retire': 0, 'missing-verification': 0, 'rows': 0}
problems = []
def finalize(r):
    r = copy.deepcopy(r)
    v = verify.get(r['id'])
    if r['decision'] == 'rewrite' and r.get('rewrite'):
        if not v:
            stats['missing-verification'] += 1; problems.append(f"{r['id']}: rewrite without a second reading")
        else:
            stats[v['verdict']] += 1
            record = {'pass': 'second-reading', 'verdict': v['verdict'], 'problems': v.get('problems') or [], 'evidence': v.get('evidence') or [], 'notes': v.get('notes') or ''}
            if v['verdict'] == 'amend':
                fields = v.get('fields') or {}
                changed = []
                for k in FIELDS:
                    if k in fields:
                        r['rewrite'][k] = fields[k]; changed.append(k)
                if v.get('rescored'): r['rewrite']['rescored'] = v['rescored']
                record['changed'] = changed
                if 'options' in fields and len(fields['options']) != 4: problems.append(f"{r['id']}: amended options are not four")
            elif v['verdict'] == 'reject':
                r['decision'] = 'quarantine'
                r['retireReason'] = 'second reading: ' + '; '.join(v.get('problems') or ['rejected'])
            r['verification'] = record
    if r['id'] in retire_by_dup and r['decision'] in ('rewrite', 'retain'):
        survivor, reason = retire_by_dup[r['id']]
        stats['dup-retire'] += 1
        r['decision'] = 'retire'
        r['retireReason'] = f'duplicate of {survivor} (cross-batch pass): {reason}'
        r['verification'] = {**(r.get('verification') or {}), 'duplicatePass': {'retired': True, 'survivor': survivor}}
    # A rewrite that was never accepted by a second reading must not be applied.
    if r['decision'] == 'rewrite':
        rs = r['rewrite'].get('rescored') or {}
        q = rs.get('qualityScore'); rel = rs.get('relevanceScore')
        if q is None or rel is None or q < 3 or rel < 4: problems.append(f"{r['id']}: rewrite fails a gate after the second reading (q {q}, r {rel})")
    return r
for f in sorted(glob.glob(f'{rev_dir}/*.jsonl') + glob.glob(f'{rev_dir}/*.json')):
    name = os.path.basename(f)
    rows = [json.loads(l) for l in open(f) if l.strip()] if f.endswith('.jsonl') else json.load(open(f))
    target = os.path.join(out, name if name.endswith('.jsonl') else name[:-5] + '.jsonl')
    with open(target, 'w') as o:
        for r in rows:
            o.write(json.dumps(finalize(r), ensure_ascii=False) + '\n'); stats['rows'] += 1
print(json.dumps(stats))
if problems: print('PROBLEMS\n  ' + '\n  '.join(problems))
