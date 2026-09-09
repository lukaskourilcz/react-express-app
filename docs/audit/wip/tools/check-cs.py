# Parity check for Czech localisation rows against their batches. Usage:
#   python3 check-cs.py <csBatchDir> <csOutDir>
import json,glob,os,sys,re
bdir, odir = sys.argv[1], sys.argv[2]
FENCE = re.compile(r'```[\s\S]*?```'); TICK = re.compile(r'`[^`\n]+`')
# The outcome labels the brief settles, with the Czech this bank uses.
LABELS = {
    'Error': 'Chyba', 'An error': 'Chyba', 'Throws': 'Vyhodí chybu',
    'Type error': 'Chyba typu', 'A type error': 'Chyba typu',
    'Runtime error': 'Chyba za běhu', 'Compiles': 'Zkompiluje se',
    'Nothing': 'Nic', 'Nothing happens': 'Nic se nestane',
    'It throws': 'Vyhodí chybu', 'None of the above': 'Nic z uvedeného',
    # A bare type noun names what kind of value came back; the quoted form
    # ("function") is a typeof result and is a value, so it is not listed here.
    'function': 'funkce', 'a function': 'funkce', 'an object': 'objekt',
    'an array': 'pole', 'a string': 'řetězec', 'a number': 'číslo',
}
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
    missing = [i for i in batch if i not in rows]
    if missing:
        problems.append(f'{name}: {len(missing)} of {len(batch)} not yet localised (first {missing[0]})' if len(missing) < len(batch) else f'{name}: none of {len(batch)} localised')
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
            # An option that is nothing but code must stay identical. "Nothing
            # but code" means: strip the backticked spans and what is left is
            # punctuation, or the whole option is a bare identifier, a
            # declaration, or a number with a unit. An option that mixes a
            # backticked token with prose is translated like any other prose.
            bare = TICK.sub('', eo).strip(' .,;:—-')
            e = eo.strip()
            # An outcome label describes what happened and is prose; the brief
            # names the Czech each takes.
            if e in LABELS:
                if co.strip() != LABELS[e]:
                    problems.append(f'{i}: outcome label {j} is {co.strip()!r}, the bank uses {LABELS[e]!r}')
                continue
            code_only = bare == '' or bool(
                re.fullmatch(r'[-\w$.]+(\s*:\s*[-\w$.%()]+)?|-?\d+(\.\d+)?[a-z%]*|"[^"]*"|\'[^\']*\'', e)
            ) and len(e.split()) <= 3
            if code_only and eo != co:
                problems.append(f'{i}: code-only option {j} changed: {eo!r} -> {co!r}')
        if r.get('status') == 'kept' and it.get('cs'):
            for k in ('question', 'options', 'explanation'):
                if r[k] != it['cs'][k]: problems.append(f'{i}: status kept but {k} differs from the served Czech')
        if r['question'] == en['question'] and len(en['question']) > 40 and not en['question'].startswith('```'): problems.append(f'{i}: question left in English')
        if r['explanation'] == en['explanation']: problems.append(f'{i}: explanation left in English')
        if r['hint'] == en['hint']: problems.append(f'{i}: hint left in English')
print(json.dumps({'rows': total, 'byStatus': counts, 'problems': len(problems)}))
for p in problems[:80]: print(' ', p)
