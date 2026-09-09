import json,sys,glob,os,collections
S=sys.argv[1]; inv=sys.argv[2]; revdir=sys.argv[3]
batches={}
for f in glob.glob(f'{inv}/batch-*.json'):
    batches[os.path.basename(f)[6:-5]]=json.load(open(f))
QD=['topicRelevance','learningValue','technicalCorrectness','wording','answerOptions','hint','explanation']
RM=['presentDay','practicalUtility','transferable','audienceFit','riskOutcome']
GENERIC=('Trace the code one line at a time','Read the code once for control flow','Identify the requirement or failure mode first','Check the statement against the normal case','Explain the term in your own words','Name the requirement or behavior first')
total=0; problems=[]; summary={}
for f in sorted(glob.glob(f'{revdir}/*.jsonl')):
    name=os.path.basename(f)[7:-6]
    rows=[]
    for i,l in enumerate(open(f)):
        l=l.strip()
        if not l: continue
        try: rows.append(json.loads(l))
        except Exception as e: problems.append(f'{name}:{i+1}: unparseable ({e})')
    batch=batches.get(name)
    if batch is None: problems.append(f'{name}: no batch'); continue
    ids=[r.get('id') for r in rows]; expected=[b['id'] for b in batch]
    if ids!=expected[:len(ids)]: problems.append(f'{name}: id order/mismatch at {next((k for k,(a,b) in enumerate(zip(ids,expected)) if a!=b), len(ids))}')
    dec=collections.Counter(); cs=collections.Counter()
    for r,b in zip(rows,batch):
        rid=r.get('id')
        def chk(cond,msg):
            if not cond: problems.append(f'{rid}: {msg}')
        q=r.get('quality',{}); m=r.get('relevance',{})
        chk(all(isinstance(q.get(k),int) and 1<=q[k]<=5 for k in QD),'quality dims')
        chk(all(isinstance(m.get(k),int) and 0<=m[k]<=2 for k in RM),'relevance markers')
        chk(r.get('qualityScore')==min(q.get(k,0) for k in QD),'qualityScore != min')
        chk(r.get('relevanceScore')==sum(m.get(k,0) for k in RM),'relevanceScore != sum')
        chk(r.get('decision') in ('retain','rewrite','retire','quarantine'),'decision')
        cb=r.get('correctnessBlocker')
        if cb in ('wrong-key','multiple-defensible','misleading-hint'): chk(r.get('qualityScore',5)<=2 or (r.get('decision')=='rewrite'), 'blocker but quality>2')
        if r.get('decision')=='rewrite':
            rw=r.get('rewrite') or {}
            chk(isinstance(rw,dict) and 'rescored' in rw,'rewrite without rescored')
            rs=rw.get('rescored',{}); rq=rs.get('quality',{}); rm=rs.get('relevance',{})
            chk(rs.get('qualityScore')==min(rq.get(k,0) for k in QD) if rq else False,'rescored qualityScore')
            chk(rs.get('relevanceScore')==sum(rm.get(k,0) for k in RM) if rm else False,'rescored relevanceScore')
            chk(rs.get('qualityScore',0)>=3 and rs.get('relevanceScore',0)>=4,'rewrite fails gates after rescoring')
            if 'options' in rw: chk(isinstance(rw['options'],list) and len(rw['options'])==4,'rewrite options != 4')
            if 'correctAnswer' in rw: chk(isinstance(rw['correctAnswer'],int) and 0<=rw['correctAnswer']<=3,'rewrite correctAnswer')
            h=rw.get('hint', b['hint'])
            chk(not h.startswith(GENERIC),'hint still generic after rewrite')
            chk(len(h.split())<=45,'hint too long')
            opts=rw.get('options',b['options']); ca=rw.get('correctAnswer',b['correctAnswer'])
            chk(opts[ca].lower() not in h.lower() or len(opts[ca])<3,'hint contains the correct option text')
        if r.get('decision')=='retain':
            chk(r.get('qualityScore',0)>=3 and r.get('relevanceScore',0)>=4,'retain fails gates')
            chk(not b['hint'].startswith(GENERIC),'retain with generic hint')
        if r.get('decision') in ('retire','quarantine'): chk(bool(r.get('retireReason')),'retire without reason')
        chk(isinstance(r.get('evidence'),list) and len(r['evidence'])>0,'no evidence')
        if b.get('cs'): chk(isinstance(r.get('cs'),dict) and r['cs'].get('status') in ('verified','drift','defect','missing'),'cs status')
        dec[r.get('decision')]+=1
        if r.get('cs'): cs[r['cs'].get('status')]+=1
    summary[name]={'rows':len(rows),'of':len(batch),'decisions':dict(dec),'cs':dict(cs)}
    total+=len(rows)
print(json.dumps(summary,indent=0))
print('total rows',total,'problems',len(problems))
for p in problems[:60]: print(' -',p)
