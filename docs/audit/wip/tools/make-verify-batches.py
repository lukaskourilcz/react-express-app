# Builds second-reading batches from the review fragments: every rewrite as it
# will be served, beside the original and the reviewer's reasoning; plus the
# cross-batch duplicate pairs. Usage:
#   python3 make-verify-batches.py <inventoryDir> <reviewDir> <outDir> [group=batch1+batch2,...] [--done <verifyOutDir>]
#
# --done names a directory of finished second readings; every id already in one
# of its .jsonl files is left out, so a batch that grew after its first round
# produces a round-two batch of exactly the rewrites nobody has checked yet.
import json,glob,os,sys,collections
argv = sys.argv[1:]
done_dir = None
if '--done' in argv:
    i = argv.index('--done'); done_dir = argv[i + 1]; del argv[i:i + 2]
inv_dir, rev_dir, out = argv[0], argv[1], argv[2]
groups = argv[3].split(',') if len(argv) > 3 else None
done = set()
if done_dir:
    for f in glob.glob(f'{done_dir}/verify-*.jsonl'):
        for l in open(f):
            if l.strip():
                r = json.loads(l)
                if 'id' in r: done.add(r['id'])
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
    ids = [i for m in members.split('+') for i in order[m]
           if rows.get(i, {}).get('decision') == 'rewrite' and rows[i].get('rewrite') and i not in done]
    if not ids: continue
    if gname == 'duplicates':
        raise SystemExit("'duplicates' is reserved for the cross-batch duplicate pairs this script writes last; name the group something else")
    json.dump([item_of(i) for i in ids], open(f'{out}/verify-{gname}.json', 'w'), indent=1, ensure_ascii=False)
    made.append((gname, len(ids)))
live = [i for i, r in rows.items() if r['decision'] in ('rewrite', 'retain')]
pairs = set()
seen_pairs = set()
if done_dir:
    for f in glob.glob(f'{done_dir}/verify-*.jsonl'):
        for l in open(f):
            if l.strip():
                r = json.loads(l)
                if 'pair' in r: seen_pairs.add(tuple(sorted(r['pair'])))
for i in live:
    for d in inv[i].get('possibleDuplicates') or []:
        if d in rows and rows[d]['decision'] in ('rewrite', 'retain') and batchof[d] != batchof[i]:
            p = tuple(sorted((i, d)))
            if p not in seen_pairs: pairs.add(p)
def dup_item(i):
    it = inv[i]; r = rows[i]
    return {'id': i, 'category': it['category'], 'level': it['level'], 'levelTitle': it['levelTitle'], 'objective': r.get('objective'), **final_of(i)}
dups = [{'pair': list(p), 'a': dup_item(p[0]), 'b': dup_item(p[1])} for p in sorted(pairs)]
if dups:
    # The pairs always land here, so a named group may not take this path: a
    # reviewer handed the duplicate pairs instead of its own batch cannot tell
    # the difference until it reads the file and finds the wrong schema.
    dup_path = f'{out}/verify-duplicates.json'
    if os.path.exists(dup_path):
        raise SystemExit(f'{dup_path} already exists; refusing to overwrite it')
    json.dump(dups, open(dup_path, 'w'), indent=1, ensure_ascii=False)
    made.append(('duplicates', len(dups)))
print(made)
