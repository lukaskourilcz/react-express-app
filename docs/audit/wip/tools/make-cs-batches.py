# Builds Czech-localisation batches from finished review batches: the final
# English (inventory + applied rewrite fields) beside the served Czech.
import json,sys,glob,os
S=sys.argv[1]; inv=sys.argv[2]; revdir=sys.argv[3]; out=sys.argv[4]; topics=sys.argv[5].split(',')
os.makedirs(out,exist_ok=True)
rows={}
for f in glob.glob(f'{revdir}/*.jsonl'):
    for l in open(f):
        if l.strip():
            r=json.loads(l); rows[r['id']]=r
for f in glob.glob(f'{revdir}/*.json'):
    for r in json.load(open(f)): rows[r['id']]=r
made=[]
for f in sorted(glob.glob(f'{inv}/batch-*.json')):
    name=os.path.basename(f)[6:-5]
    topic=name.rsplit('-',1)[0] if name[-1].isdigit() else name
    if topic not in topics: continue
    items=json.load(open(f)); batch=[]
    for it in items:
        r=rows.get(it['id'])
        if not r or r['decision'] in ('retire','quarantine'): continue
        rw=(r.get('rewrite') or {}) if r['decision']=='rewrite' else {}
        changed=[k for k in ('hint','question','options','explanation') if k in rw]
        # The English comes from the inventory, never from the review row. This
        # runs after the rewrites are applied, so the inventory IS the final
        # English — and it is the only copy that carries a correction made to a
        # seed file after the apply. Preferring the review row hands translators
        # text the bank no longer serves; that happened to three items whose
        # explanations were fixed by the artifact sweep after their rewrites
        # landed. `changed` still comes from the review row, since what the
        # audit rewrote is what tells a translator the served Czech is stale.
        en={k:it[k] for k in ('hint','question','options','explanation')}
        cs=it.get('cs')
        batch.append({'id':it['id'],'category':it['category'],'level':it['level'],'levelTitle':it['levelTitle'],'en':en,
                      'cs': {k:cs[k] for k in ('hint','question','options','explanation')} if cs else None,
                      'reviewerCs': r.get('cs') or {'status':'missing','notes':''},'changed':changed})
    if batch:
        json.dump(batch,open(f'{out}/cs-batch-{name}.json','w'),indent=1,ensure_ascii=False); made.append((name,len(batch)))
print(made)
