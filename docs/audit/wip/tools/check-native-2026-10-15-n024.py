"""Validate the stated schema examples locally, not a provider response."""
import json
import sys
from importlib.metadata import version
from pathlib import Path
from jsonschema import Draft202012Validator
rows = {row['id']: row for row in json.loads(Path(sys.argv[1]).read_text())}
schema = {'type': 'object', 'required': ['ticketId', 'category', 'confidence'], 'properties': {
    'ticketId': {'type': 'string'},
    'category': {'enum': ['billing', 'bug', 'account', 'other'], 'type': 'string'},
    'confidence': {'type': 'number'}}}
validator = Draft202012Validator(schema)
# This counterexample is structurally valid even if the referenced ticket is
# closed and its semantic category is wrong. No model/provider is called.
valid_shape = {'ticketId': 'closed-fixture-ticket', 'category': 'billing', 'confidence': 0.94}
assert validator.is_valid(valid_shape)
assert not validator.is_valid({**valid_shape, 'category': 'unknown'})
assert not validator.is_valid({**valid_shape, 'confidence': '0.94'})
assert not validator.is_valid({key: value for key, value in valid_shape.items() if key != 'confidence'})
assert validator.is_valid({**valid_shape, 'confidence': 1.4})
range_schema = json.loads(json.dumps(schema))
range_schema['properties']['confidence'].update({'minimum': 0, 'maximum': 1})
assert not Draft202012Validator(range_schema).is_valid({**valid_shape, 'confidence': 1.4})
try:
    json.loads('{"ticketId":')
    raise AssertionError('cut-off JSON example must fail')
except json.JSONDecodeError:
    pass
assert json.loads('{"ticketId":"x"}') == {'ticketId': 'x'}  # Parse success alone is not completeness.
out = {'checkedRecords': 2, 'jsonschemaVersion': version('jsonschema'),
       'records': [{'id': key, 'contentHash': rows[key]['contentHash']} for key in ['fde-v1-m04-q2', 'fde-v1-m04-q3']],
       'checks': ['stated required/types/enum; structural-valid semantic counterexample',
                  'number-only permits 1.4, explicit range rejects it', 'parse validity differs from required/completion checks'],
       'limits': 'Local schema examples, not provider guarantees, real classification, calibration or server Python.'}
Path(sys.argv[2]).write_text(json.dumps(out, indent=2) + '\n')
Path(sys.argv[2]).chmod(0o600)
print('PASS actual JSON Schema examples: structure, required confidence and separate range')
