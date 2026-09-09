# Writes one context sidecar per batch from a template directory of existing
# contexts (one per topic suffices). Usage:
#   python3 make-contexts.py <inventoryDir> <templateContextDir> <outDir>
import json,sys,os,glob
inv,tpl,out=sys.argv[1:4]
old={os.path.basename(f)[8:-5]:json.load(open(f)) for f in glob.glob(f'{tpl}/context-*.json')}
bytopic={v['topic']:v for v in old.values()}
os.makedirs(out,exist_ok=True)
def topic_of(name):
    if name=='testing-fix': return 'testing-fix'
    return name.rsplit('-',1)[0] if name[-1].isdigit() else name
for f in sorted(glob.glob(f'{inv}/batch-*.json')):
    name=os.path.basename(f)[6:-5]
    if name in ('cool-stuff','html-legacy','css-legacy'): continue
    topic=topic_of(name)
    if topic not in bytopic: print('no template for',topic); continue
    b=json.load(open(f)); ctx=dict(bytopic[topic])
    ctx.update({'batch':name,'items':len(b),'idRange':[b[0]['id'],b[-1]['id']],'levelsInThisBatch':sorted(set(x['level'] for x in b if x['level']))})
    json.dump(ctx,open(f'{out}/context-{name}.json','w'),indent=1,ensure_ascii=False)
print(len(glob.glob(f'{out}/*.json')),'contexts')
