# Applies the outcome-label rule (CS-BRIEF non-negotiable 3) to finished Czech
# rows, so batches written before the rule was settled agree with those written
# after it. An option that only names what happened takes its Czech form; an
# option that is a value or a type stays English. Usage:
#   python3 normalise-cs.py <csBatchDir> <csOutDir> [--dry]
import json,glob,os,sys
bdir, odir = sys.argv[1], sys.argv[2]
dry = '--dry' in sys.argv
# Only these batches, when named. A batch still being appended to by a
# translator must never be rewritten underneath it.
only = [a for a in sys.argv[3:] if not a.startswith('--')]
# English outcome label -> the Czech this bank uses for it.
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
changed = 0; rows = 0; files = 0
for bf in sorted(glob.glob(f'{bdir}/cs-batch-*.json')):
    name = os.path.basename(bf)[9:-5]
    if only and name not in only: continue
    of = f'{odir}/cs-{name}.jsonl'
    if not os.path.exists(of): continue
    batch = {it['id']: it for it in json.load(open(bf))}
    out = []; touched = False
    for l in open(of):
        if not l.strip(): continue
        r = json.loads(l); rows += 1
        it = batch.get(r['id'])
        if it and isinstance(r.get('options'), list) and len(r['options']) == len(it['en']['options']):
            for j, (eo, co) in enumerate(zip(it['en']['options'], r['options'])):
                want = LABELS.get(eo.strip())
                if want and co.strip() != want:
                    r['options'][j] = want; changed += 1; touched = True
        out.append(r)
    if touched:
        files += 1
        if not dry:
            with open(of, 'w') as o:
                for r in out: o.write(json.dumps(r, ensure_ascii=False) + '\n')
print(json.dumps({'rows': rows, 'optionsNormalised': changed, 'filesTouched': files, 'dry': dry}))
