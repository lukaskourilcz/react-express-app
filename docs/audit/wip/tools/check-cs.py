# Parity check for Czech localisation rows against their batches. Usage:
#   python3 check-cs.py <csBatchDir> <csOutDir>
import json,glob,os,sys,re
bdir, odir = sys.argv[1], sys.argv[2]
FENCE = re.compile(r'```[\s\S]*?```'); TICK = re.compile(r'`[^`\n]+`')
total = 0; problems = []; counts = {}
for bf in sorted(glob.glob(f'{bdir}/cs-batch-*.json')):
    name = os.path.basename(bf)[9:-5]
    batch = {it['id']: it for it in json.load(open(bf))}
    of = f'{odir}/cs-{name}.jsonl'
    if not os.path.exists(of): problems.append(f'{name}: no output'); continue
    rows = {}
    for i, l in enumerate(open(of)):
        if not l.strip(): continue
        try: r = json.loads(l)
        except Exception as e: problems.append(f'{name}:{i+1}: unparseable ({e})'); continue
        if r['id'] in rows: problems.append(f"{name}: duplicate row {r['id']}")
        rows[r['id']] = r
    for i in batch:
        if i not in rows: problems.append(f'{name}: missing {i}')
    for i, r in rows.items():
        it = batch.get(i)
        if not it: problems.append(f'{name}: unknown id {i}'); continue
        total += 1; counts[r.get('status')] = counts.get(r.get('status'), 0) + 1
        en = it['en']
        if not isinstance(r.get('options'), list) or len(r['options']) != 4: problems.append(f'{i}: options not four'); continue
        for k in ('hint', 'question', 'explanation'):
            if not isinstance(r.get(k), str) or not r[k].strip(): problems.append(f'{i}: empty {k}')
        for k in ('question', 'explanation', 'hint'):
            for m in FENCE.findall(en[k]):
                if m not in r[k]: problems.append(f'{i}: fenced block changed in {k}')
            for m in TICK.findall(FENCE.sub('', en[k])):
                if m not in r[k]: problems.append(f'{i}: backticked token {m} missing in {k}')
        for j, (eo, co) in enumerate(zip(en['options'], r['options'])):
            if not isinstance(co, str) or not co.strip(): problems.append(f'{i}: empty option {j}'); continue
            for m in TICK.findall(eo):
                if m not in co: problems.append(f'{i}: option {j} lost {m}')
            # Options that are pure code/values must stay identical.
            if re.fullmatch(r'[`\w\.\[\]\(\)\{\}\'":,\-\s<>/=+*!?&|;%#@$^~]*', eo) and not re.search(r'[A-Za-z]{3,}\s+[A-Za-z]{3,}', eo) and eo != co and eo.strip('`') != co.strip('`'):
                problems.append(f'{i}: code-like option {j} changed: {eo!r} -> {co!r}')
        if r.get('status') == 'kept' and it.get('cs'):
            for k in ('question', 'options', 'explanation'):
                if r[k] != it['cs'][k]: problems.append(f'{i}: status kept but {k} differs from the served Czech')
        if r['question'] == en['question'] and len(en['question']) > 40 and not en['question'].startswith('```'): problems.append(f'{i}: question left in English')
        if r['explanation'] == en['explanation']: problems.append(f'{i}: explanation left in English')
        if r['hint'] == en['hint']: problems.append(f'{i}: hint left in English')
print(json.dumps({'rows': total, 'byStatus': counts, 'problems': len(problems)}))
for p in problems[:80]: print(' ', p)
