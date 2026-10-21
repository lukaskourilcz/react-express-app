"""Local audit only: three individually read authored Python contexts.
No Python execution feature is added to devShark; no learner code runs here.
"""
import asyncio
import inspect
import json
import sys
from pathlib import Path
rows = {row['id']: row for row in json.loads(Path(sys.argv[1]).read_text())}
ids = ['fde-v1-bridge-python-q1', 'fde-v1-bridge-python-q2', 'fde-v1-bridge-python-q3']
spaces = {}
for item_id in ids:
    namespace = {}
    exec(compile(rows[item_id]['material']['context']['code'], item_id, 'exec'), namespace)
    spaces[item_id] = namespace
owner = spaces[ids[0]]['owner_email']
assert owner({}) is None
assert owner({}, None) is None
assert owner({'owner_email': None}, 'fallback') == 'fallback'
assert owner({'owner_email': '  OPS@EXAMPLE.TEST  '}) == 'ops@example.test'
assert owner({'owner_email': '  '}) == ''
try:
    owner({'owner_email': 42})
    raise AssertionError('annotations do not validate arbitrary dict values')
except AttributeError:
    pass
class Response:
    def json(self):
        return {'items': [{'id': 1}]}
class Client:
    def __init__(self):
        self.paths = []
    async def get(self, path):
        self.paths.append(path)
        return Response()
client = Client()
collect = spaces[ids[1]]['collect']
coroutine = collect(client, 'northwind')
assert inspect.iscoroutine(coroutine)
assert client.paths == []
coroutine.close()  # No unawaited-coroutine warning is needed for this proof.
assert asyncio.run(collect(client, 'northwind')) == [{'id': 1}]
assert client.paths == ['/tenants/northwind/tickets']
record = spaces[ids[2]]['record']
assert record == json.loads(rows[ids[2]]['material']['options'][0]['en'])
assert type(record['id']) is int
assert record['primary_email'] == 'ops@brightpier.example'
assert next(iter([]), None) is None
assert {'plan': None}.get('plan', 'starter') is None
output = {'pythonVersion': sys.version.split()[0], 'checkedRecords': 3,
          'records': [{'id': item_id, 'contentHash': rows[item_id]['contentHash']} for item_id in ids],
          'checks': ['Optional/default/explicit None and non-string runtime error',
                     'coroutine has no body effects until driven; later awaiting returns list',
                     'exact literal mapping and absent-only get/next defaults'],
          'limits': 'Local authored-context proof, not server-side Python, a type-checker run, learner-code execution or independent review.'}
Path(sys.argv[2]).write_text(json.dumps(output, indent=2) + '\n')
Path(sys.argv[2]).chmod(0o600)
print('PASS three individually read Python contexts locally; no server Python acceptance claimed')
