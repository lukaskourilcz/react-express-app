# Folds the second reading (verify-out/*.jsonl) and the cross-batch duplicate
# decisions into the review fragments, writing one final JSON Lines file per
# batch under <outDir>. The originals are never modified. Usage:
#   python3 merge-verification.py <reviewDir> <verifyDir> <outDir> [inventoryDir]
import json,glob,os,sys,copy
rev_dir, ver_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
inv_dir = sys.argv[4] if len(sys.argv) > 4 else 'docs/audit/wip/inventory'
inv = {}
for f in glob.glob(f'{inv_dir}/batch-*.json'):
    for it in json.load(open(f)): inv[it['id']] = it
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
# Keys settled by hand, with the reason. Used only where the reviewer rebuilt
# the options and the old key's wording changed too, so no text match can
# resolve it and guessing would be a coin toss.
MANUAL_KEYS = {
    'rm-node-156': (1, "the second reader rebuilt all four options as parallel statements and recorded \"Key stays at index 1\" in its notes; index 1 is the one-way statement, which is what the original keyed"),
    'rm-ts-80': (1, 'the reviewer replaced the key\'s wording ("Valid (recursive alias)" -> "Compiles") in place; index unchanged, confirmed against the rewritten explanation, which says the alias compiles'),
}
stats = {'accept': 0, 'amend': 0, 'reject': 0, 'dup-retire': 0, 'missing-verification': 0, 'rows': 0, 'redistribution-proposal': 0}
problems = []
def finalize(r):
    r = copy.deepcopy(r)
    # The wording keyed before the second reading touched anything: the
    # reviewer's rewritten options if it rebuilt them, otherwise the served
    # ones. A key resolved against this survives an amendment that rebuilds
    # the options again.
    item0 = inv.get(r['id'])
    rw0 = r.get('rewrite') or {}
    base_options = rw0['options'] if isinstance(rw0.get('options'), list) else (item0['options'] if item0 else None)
    base_key = rw0.get('correctAnswer', item0['correctAnswer'] if item0 else None)
    base_key_text = base_options[base_key].strip() if (base_options and isinstance(base_key, int) and 0 <= base_key < len(base_options)) else None
    v = verify.get(r['id'])
    if r['decision'] == 'rewrite' and r.get('rewrite'):
        if not v:
            # A rewrite in a section no delivery request reaches is a proposal
            # to move the item somewhere live, not a rewrite that will be
            # served. The patcher skips it and a human decides it, so it needs
            # no second reading — see devshark-redistribution-candidates.md.
            if (item0 or {}).get('delivery') in ('retired-section', 'unreferenced'):
                stats['redistribution-proposal'] += 1
            else:
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
    elif r['decision'] == 'retain' and v:
        # A second reader may find a defect in an item the first pass kept —
        # usually a hint that would sit unchanged on any other item. The row has
        # no rewrite to fold the amendment into, so promote it to one carrying
        # just the amended fields. Without this the amendment is silently lost.
        stats[v['verdict']] += 1
        record = {'pass': 'second-reading', 'verdict': v['verdict'], 'problems': v.get('problems') or [], 'evidence': v.get('evidence') or [], 'notes': v.get('notes') or ''}
        if v['verdict'] == 'amend':
            fields = v.get('fields') or {}
            changed = [k for k in FIELDS if k in fields]
            if changed:
                rewrite = {k: fields[k] for k in changed}
                if 'options' in fields:
                    if len(fields['options']) != 4: problems.append(f"{r['id']}: amended options are not four")
                    if 'correctAnswer' in fields: rewrite['correctAnswer'] = fields['correctAnswer']
                    elif base_key is not None: rewrite['correctAnswer'] = base_key
                # A retained item already cleared both gates, so its own scores
                # stand unless the second reader restated them. Carry the whole
                # block, dimensions and markers included: the ledger stores the
                # per-dimension breakdown, and the registry recomputes both
                # totals from it to check the row is self-consistent, so the two
                # scores alone leave a row that cannot be verified.
                rewrite['rescored'] = v.get('rescored') or {
                    'quality': r.get('quality'), 'qualityScore': r.get('qualityScore'),
                    'relevance': r.get('relevance'), 'relevanceScore': r.get('relevanceScore'),
                }
                r['decision'] = 'rewrite'
                r['rewrite'] = rewrite
                stats['retain-promoted'] = stats.get('retain-promoted', 0) + 1
            record['changed'] = changed
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
        rw = r['rewrite']
        rs = rw.get('rescored') or {}
        q = rs.get('qualityScore'); rel = rs.get('relevanceScore')
        if q is None or rel is None or q < 3 or rel < 4: problems.append(f"{r['id']}: rewrite fails a gate after the second reading (q {q}, r {rel})")
        # Rebuilt options with no stated key silently reuse the old index. That
        # is right only when the key text did not move, so it is checked by
        # hand rather than assumed.
        # Rebuilt options with no stated key: resolve it by finding the text
        # the reviewer keyed before. Only an exact, unique match is safe; a key
        # whose wording also changed has to be stated, not guessed.
        if isinstance(rw.get('options'), list) and 'correctAnswer' not in rw:
            if base_key_text is None: problems.append(f"{r['id']}: options rewritten without a stated correctAnswer and nothing to resolve it against")
            else:
                matches = [i for i, o in enumerate(rw['options']) if o.strip() == base_key_text]
                if len(matches) == 1:
                    rw['correctAnswer'] = matches[0]
                    stats['key-resolved'] = stats.get('key-resolved', 0) + 1
                    if matches[0] != base_key: stats['key-moved'] = stats.get('key-moved', 0) + 1
                elif r['id'] in MANUAL_KEYS:
                    rw['correctAnswer'], why = MANUAL_KEYS[r['id']]
                    r.setdefault('verification', {}).setdefault('manualKey', why)
                    stats['key-manual'] = stats.get('key-manual', 0) + 1
                else:
                    problems.append(f"{r['id']}: options rewritten without a stated correctAnswer and the old key text is not in them")
        if 'correctAnswer' in rw and not (isinstance(rw['correctAnswer'], int) and 0 <= rw['correctAnswer'] <= 3): problems.append(f"{r['id']}: correctAnswer out of range")
        opts = rw.get('options')
        # Case matters in this bank: "Active" and "ACTIVE" are a legitimate
        # pair when the item is about a string enum's name versus its value.
        if isinstance(opts, list) and len({o.strip() for o in opts}) < 4: problems.append(f"{r['id']}: rewritten options are not four distinct strings")
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
