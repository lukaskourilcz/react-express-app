# Sweeps learner-visible copy for things that belong to the audit rather than
# to the learner: the reviewer's working notes, the reviewer's vocabulary, and
# references to an option by its position (the server shuffles answer order
# before serving, so "the first option" points at nothing).
#
# Usage: python3 sweep-artifacts.py <inventoryDir>
# Exits non-zero if anything is found, so it can gate a merge.
import json, os, re, sys

INV = sys.argv[1]

# A hash has at least one hex letter; a plain run of digits is a number.
HASH = re.compile(r'(?<![0-9a-zA-Z_.-])(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}(?![0-9a-zA-Z_-])')
UUID = re.compile(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b')

PATTERNS = [
    ('item id', re.compile(r'\brm-[a-z]+-\d+\b')),
    ('working note', re.compile(r'\((?:verified|measured|checked|confirmed)[:\s]', re.I)),
    ('scratch path', re.compile(r'/tmp/|scratchpad|node_modules/\.cache')),
    ('reviewer vocabulary', re.compile(r'\bdistractors?\b|\bthe key option\b|\bthe first pass\b|\bsecond reading\b', re.I)),
    ('reviewer vocabulary (cs)', re.compile(r'\bdistraktor\w*\b|\brozptylova\w+\b', re.I)),
    ('option by position', re.compile(
        r'\boptions? [0-9]\b|\bthe (?:first|second|third|fourth|last) (?:option|answer|choice)\b'
        r'|\b(?:prvn[íi]|druh[áa]|t[řr]et[íi]|[čc]tvrt[áa]|posledn[íi]) (?:mo[žz]nost|odpov[ěe][ďd])\b', re.I)),
]


# Matches that read as an artifact but are the item's own subject, each
# settled by hand. Keyed by item, field and the matched text.
ALLOW = {
    # OWASP ranks password hashing functions; "first choice" is its ranking,
    # not this item's option order.
    ('rm-security-25', 'explanation', 'the first choice'),
}


def scan(text, item_id, field, out):
    for name, pat in PATTERNS:
        m = pat.search(text)
        if m and (item_id, field, m.group(0)) not in ALLOW:
            out.append((item_id, field, name, m.group(0), context(text, m)))
    for m in HASH.finditer(text):
        if UUID.search(text, max(0, m.start() - 40), m.end() + 40):
            continue  # an example UUID is content, not a commit
        out.append((item_id, field, 'commit hash', m.group(0), context(text, m)))


def context(text, m):
    return text[max(0, m.start() - 70):m.end() + 70].replace('\n', ' ')


def fields_of(item):
    out = {}
    for key in ('question', 'hint', 'explanation'):
        if isinstance(item.get(key), str):
            out[key] = item[key]
    for i, option in enumerate(item.get('options') or []):
        out[f'option{i}'] = option
    cs = item.get('cs') or {}
    for key in ('question', 'hint', 'explanation'):
        if isinstance(cs.get(key), str):
            out['cs.' + key] = cs[key]
    for i, option in enumerate(cs.get('options') or []):
        out[f'cs.option{i}'] = option
    return out


hits = []
count = 0
for name in sorted(os.listdir(INV)):
    if not name.startswith('batch-'):
        continue
    for item in json.load(open(os.path.join(INV, name), encoding='utf-8')):
        count += 1
        for field, text in fields_of(item).items():
            scan(text, item['id'], field, hits)

for item_id, field, kind, matched, ctx in hits:
    print(f'{item_id:<20}{field:<16}{kind:<26}{matched!r}\n    ...{ctx}...')
print(f'{len(hits)} hit(s) across {count} items')
sys.exit(1 if hits else 0)
