# Builds second-reading batches from the review fragments: every rewrite as it
# will be served, beside the original and the reviewer's reasoning; plus the
# cross-batch duplicate pairs. Usage:
#   python3 make-verify-batches.py <inventoryDir> <reviewDir> <outDir> [group=batch1+batch2,...]
import json,glob,os,sys,collections
inv_dir, rev_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
groups = sys.argv[4].split(',') if len(sys.argv) > 4 else None
os.makedirs(out, exist_ok=True)
rows = {}
for f in glob.glob(f'{rev_dir}/*.jsonl'):
    for l in open(f):
        if l.strip():
            r = json.loads(l); rows[r['id']] = r
for f in glob.glob(f'{rev_dir}/*.json'):
    for r in json.load(open(f)): rows[r['id']] = r
inv = {}; batchof = {}; order = collections.defaultdict(list)
for f in sorted(glob.glob(f'{inv_dir}/batch-*.json')):
    name = os.path.basename(f)[6:-5]
    for it in json.load(open(f)):
        inv[it['id']] = it; batchof[it['id']] = name; order[name].append(it['id'])
def final_of(i):
    it = inv[i]; r = rows[i]
    rw = (r.get('rewrite') or {}) if r['decision'] == 'rewrite' else {}
    return {k: rw.get(k, it[k]) for k in ('hint', 'question', 'options', 'correctAnswer', 'explanation')}
def item_of(i):
    it = inv[i]; r = rows[i]; rw = r.get('rewrite') or {}
    changed = [k for k in ('hint', 'question', 'options', 'correctAnswer', 'explanation') if k in rw]
    return {
        'id': i, 'category': it['category'], 'level': it['level'], 'levelTitle': it['levelTitle'], 'difficulty': it['difficulty'],
        'risky': any(k in rw for k in ('question', 'options', 'correctAnswer')),
        'original': {k: it[k] for k in ('hint', 'question', 'options', 'correctAnswer', 'explanation')},
        'final': final_of(i), 'changed': changed,
        'reviewer': {'objective': r.get('objective'), 'rationale': r.get('rationale'), 'evidence': r.get('evidence', []), 'defects': r.get('defects', []), 'rescored': rw.get('rescored')},
    }
made = []
if groups is None:
    groups = [f'{n}={n}' for n in sorted(order) if any(rows.get(i, {}).get('decision') == 'rewrite' for i in order[n])]
for g in groups:
    gname, members = g.split('=')
    ids = [i for m in members.split('+') for i in order[m] if rows.get(i, {}).get('decision') == 'rewrite' and rows[i].get('rewrite')]
    if not ids: continue
    json.dump([item_of(i) for i in ids], open(f'{out}/verify-{gname}.json', 'w'), indent=1, ensure_ascii=False)
    made.append((gname, len(ids)))
live = [i for i, r in rows.items() if r['decision'] in ('rewrite', 'retain')]
pairs = set()
for i in live:
    for d in inv[i].get('possibleDuplicates') or []:
        if d in rows and rows[d]['decision'] in ('rewrite', 'retain') and batchof[d] != batchof[i]:
            pairs.add(tuple(sorted((i, d))))
def dup_item(i):
    it = inv[i]; r = rows[i]
    return {'id': i, 'category': it['category'], 'level': it['level'], 'levelTitle': it['levelTitle'], 'objective': r.get('objective'), **final_of(i)}
dups = [{'pair': list(p), 'a': dup_item(p[0]), 'b': dup_item(p[1])} for p in sorted(pairs)]
if dups:
    json.dump(dups, open(f'{out}/verify-duplicates.json', 'w'), indent=1, ensure_ascii=False)
    made.append(('duplicates', len(dups)))
print(made)
