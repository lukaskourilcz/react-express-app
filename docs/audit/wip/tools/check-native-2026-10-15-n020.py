"""Audit only: exact authored contexts with isolated environment and MockTransport.
No network, real credentials, learner code or server-side Python execution.
"""
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch
import httpx
rows = {row['id']: row for row in json.loads(Path(sys.argv[1]).read_text())}
ids = ['fde-v1-bridge-python-q4', 'fde-v1-bridge-python-q5']
space = {}
with patch.dict(os.environ, {'TRIAGE_API_TOKEN': 'fixture-only'}, clear=True):
    exec(compile(rows[ids[0]]['material']['context']['code'], ids[0], 'exec'), space)
assert type(space['BATCH_SIZE']) is int and space['BATCH_SIZE'] == 25
assert type(space['TIMEOUT']) is float and space['TIMEOUT'] == 5.0
assert space['API_TOKEN'] == 'fixture-only'
space = {}
exec(compile(rows[ids[1]]['material']['context']['code'], ids[1], 'exec'), space)
fetch_page = space['fetch_page']
matrix = []
for status in [101, 200, 201, 204, 301, 400, 500]:
    body = b'' if status == 204 else b'{"items":[1]}'
    seen = []
    def respond(request):
        seen.append(request)
        return httpx.Response(status, content=body, headers={'location': '/other'})
    with httpx.Client(base_url='https://fixture.example', transport=httpx.MockTransport(respond)) as client:
        response = client.get('/v1/tickets')
        assert isinstance(response, httpx.Response)
        raised = False
        try:
            assert response.raise_for_status() is response
        except httpx.HTTPStatusError:
            raised = True
        assert raised == (not 200 <= status < 300)
        assert len(seen) == 1  # Default Client does not follow 301.
        outcome = 'json'
        try:
            assert fetch_page(client, None) == {'items': [1]}
        except httpx.HTTPStatusError:
            outcome = 'status-error'
        except json.JSONDecodeError:
            outcome = 'json-error'
        assert outcome == ('status-error' if raised else 'json-error' if status == 204 else 'json')
        matrix.append({'status': status, 'statusRaises': raised, 'fetchOutcome': outcome})
with httpx.Client(base_url='https://fixture.example', transport=httpx.MockTransport(lambda request: httpx.Response(200, content=b'not json'))) as client:
    try:
        fetch_page(client, 'cursor')
        raise AssertionError('200 does not guarantee valid JSON')
    except json.JSONDecodeError:
        pass
output = {'checkedRecords': 2, 'pythonVersion': sys.version.split()[0], 'httpxVersion': httpx.__version__,
          'records': [{'id': item_id, 'contentHash': rows[item_id]['contentHash']} for item_id in ids],
          'statusMatrix': matrix, 'limits': 'Local exact authored contexts with mocked transport; not live HTTP, server Python or learner-code execution.'}
Path(sys.argv[2]).write_text(json.dumps(output, indent=2) + '\n')
Path(sys.argv[2]).chmod(0o600)
print('PASS environment defaults and actual HTTPX 1xx/2xx/3xx/4xx/5xx behavior without network')
