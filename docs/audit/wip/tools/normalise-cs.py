# Applies the outcome-label rule (CS-BRIEF non-negotiable 3) to finished Czech
# rows, so batches written before the rule was settled agree with those written
# after it. An option that only names what happened takes its Czech form; an
# option that is a value or a type stays English. Usage:
#   python3 normalise-cs.py <csBatchDir> <csOutDir> [--dry]
import json,glob,os,re,sys
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
# Czech groups thousands with a space, not a comma: "100,000 prvky" is read as
# one hundred, with a decimal comma. The English figures are carried through
# verbatim by instruction, so this has to be undone afterwards — but only in
# prose. Inside backticks or a fence the text is code a learner retypes, and
# there the English grouping is what belongs.
CODE = re.compile(r'```[\s\S]*?```|`[^`\n]+`')
THOUSANDS = re.compile(r'(?<![\d.,])\d{1,3}(?:,\d{3})+(?![\d])')
NBSP = '\u00a0'

def degroup(text):
    """Replace a comma thousands separator with a non-breaking space, outside code."""
    out = []; last = 0; n = 0
    for m in CODE.finditer(text):
        piece, count = THOUSANDS.subn(lambda g: g.group(0).replace(',', NBSP), text[last:m.start()])
        out.append(piece); n += count
        out.append(m.group(0)); last = m.end()
    piece, count = THOUSANDS.subn(lambda g: g.group(0).replace(',', NBSP), text[last:])
    out.append(piece); n += count
    return ''.join(out), n

changed = 0; rows = 0; files = 0; regrouped = 0
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
        for k in ('question', 'hint', 'explanation'):
            if isinstance(r.get(k), str):
                fixed, n = degroup(r[k])
                if n: r[k] = fixed; regrouped += n; touched = True
        if isinstance(r.get('options'), list):
            for j, o in enumerate(r['options']):
                if isinstance(o, str):
                    fixed, n = degroup(o)
                    if n: r['options'][j] = fixed; regrouped += n; touched = True
        out.append(r)
    if touched:
        files += 1
        if not dry:
            with open(of, 'w') as o:
                for r in out: o.write(json.dumps(r, ensure_ascii=False) + '\n')
print(json.dumps({'rows': rows, 'optionsNormalised': changed, 'thousandsRegrouped': regrouped, 'filesTouched': files, 'dry': dry}))
