# Adds automated flags to reviewer batches written by `npm run
# audit:devshark-inventory -- --out <dir>`: generic-hint detection, a longer
# correct option, absolute or time-sensitive wording, near-duplicate ids
# (Jaccard >= 0.7 on stem words or identical code block) and EN/CS drift
# (code block or code-like option differs between the English and the served
# Czech). Usage: python3 enrich-batches.py <inventoryDir>
import json,re,sys,os,glob,itertools,collections
src=sys.argv[1]
batches={os.path.basename(f)[6:-5]:json.load(open(f)) for f in glob.glob(f'{src}/batch-*.json')}
allitems=[it for b in batches.values() for it in b]
def norm(t):
    t=re.sub(r'```[\s\S]*?```',' ',t).lower(); return set(re.findall(r'[a-z0-9]+',t))
toks={it['id']:norm(it['question']) for it in allitems}
codes={it['id']:re.sub(r'\s+','',''.join(re.findall(r'```[\s\S]*?```',it['question']))) for it in allitems}
dups=collections.defaultdict(set); bykey=collections.defaultdict(list)
for it in allitems:
    for w in toks[it['id']]: bykey[w].append(it['id'])
cand=set()
for w,lst in bykey.items():
    if 1<len(lst)<=40:
        for a,b in itertools.combinations(lst,2): cand.add((a,b))
for a,b in cand:
    A,B=toks[a],toks[b]
    if not A or not B: continue
    if len(A&B)/len(A|B)>=0.7 or (codes[a] and codes[a]==codes[b]): dups[a].add(b); dups[b].add(a)
def words(s): return len(re.sub(r'```[\s\S]*?```',' ',s).split())
unserious=re.compile(r"\b(cpu temperature|physical coin|color scheme|developer(?:'s|’s) mood|make buttons blue|random chance|magic happens|faster css|slow css)\b",re.I)
def codeblocks(t): return [re.sub(r'\s+','',c) for c in re.findall(r'```[\s\S]*?```',t or '')]
def codelike(o):
    return bool(re.fullmatch(r'[\s\w.\[\]{}()"\'`<>:;=+\-*/%!&|?,^~$#@\\]*',o)) and (re.search(r'[\[\]{}()"`=;<>]|^\d|^-?\d|^"',o) is not None) and not re.search(r'\s[a-z]{4,}\s',o)
GENERIC=r'^(Trace the code one line at a time|Read the code once for control flow|Identify the requirement or failure mode first|Check the statement against the normal case|Explain the term in your own words|Name the requirement or behavior first)'
for name,b in batches.items():
    for it in b:
        flags=[]
        c=words(it['options'][it['correctAnswer']]); d=[words(o) for i,o in enumerate(it['options']) if i!=it['correctAnswer']]
        if c>=8 and c>=3*sum(d)/max(1,len(d)): flags.append('correct option is markedly longer/more detailed than distractors')
        if any(unserious.search(o) for i,o in enumerate(it['options']) if i!=it['correctAnswer']): flags.append('unserious distractor')
        if re.search(r'\b(always|never|all of the above|none of the above)\b',it['question'],re.I): flags.append('absolute/test-taking language in stem')
        if re.search(r'\b(latest|currently|today|now|deprecated|no longer|recently|new)\b',it['question']+' '+it['explanation'],re.I): flags.append('time-sensitive wording: verify against a dated primary source')
        if re.match(GENERIC,it['hint'] or ''): flags.append('hint is the generic shape-based fallback (not question-specific)')
        if len(set(o.strip().lower() for o in it['options']))<4: flags.append('duplicate options')
        if dups.get(it['id']): it['possibleDuplicates']=sorted(dups[it['id']])
        cs=it.get('cs')
        if cs:
            drift=[]
            if codeblocks(it['question'])!=codeblocks(cs['question']): drift.append('code block differs between EN and CS question')
            if cs['options'] and len(cs['options'])!=len(it['options']): drift.append('CS option count differs (EN options will be shown)')
            elif cs['options']:
                for i,(a,cc) in enumerate(zip(it['options'],cs['options'])):
                    if codelike(a) and re.sub(r'\s+','',a)!=re.sub(r'\s+','',cc): drift.append(f'code-like option {i} differs: EN {a!r} vs CS {cc!r}')
            if not cs['options']: drift.append('CS has no options (EN options shown with CS question)')
            if drift: it['csDriftFlags']=drift
        it['automatedFlags']=flags
    json.dump(b,open(f'{src}/batch-{name}.json','w'),indent=1,ensure_ascii=False)
print(sorted((k,len(v)) for k,v in batches.items()))
