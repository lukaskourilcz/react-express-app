// Selected worker evidence, not a proof of arbitrary algorithms or memory use.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { buildSandboxWorker } from '../../../../scripts/build-sandbox-worker.mjs';
import { pathById, activityIn } from '../../../../lib/learning-paths/catalog';
import { solutionFor } from '../../../../lib/learning-paths/solutions';
import { gradePathCode } from '../../../../lib/learning-paths/grade';

await buildSandboxWorker();
const path = pathById('dsa-foundations')!;
const candidates = {
  'dsa-v1-d05-prepend-and-find': {
    alternative: 'function prepend(head,value){const node={next:head,value};return node;}function find(head,value){for(let node=head;node!==null;node=node.next)if(node.value===value)return node;return null;}',
    'wrong-same-value-zero': 'function prepend(head,value){return {value,next:head};}function find(head,value){for(let n=head;n;n=n.next)if(n.value===value||(n.value!==n.value&&value!==value))return n;return null;}',
    'wrong-finds-with-write': 'function prepend(head,value){return {value,next:head};}function find(head,value){for(let n=head;n;n=n.next)if(n.value===value){n.extra=true;return n;}return null;}',
    'wrong-loose-equality': 'function prepend(head,value){return {value,next:head};}function find(head,value){for(let n=head;n;n=n.next)if(n.value==value)return n;return null;}',
    'wrong-last-match': 'function prepend(head,value){return {value,next:head};}function find(head,value){let result=null;for(let n=head;n;n=n.next)if(n.value===value)result=n;return result;}',
  },
  'dsa-v1-d05-delete-first-match': {
    alternative: 'function deleteFirst(head,value){let previous=null,current=head;while(current!==null){if(current.value===value){if(previous===null)return current.next;previous.next=current.next;return head;}previous=current;current=current.next;}return head;}',
    'wrong-object-is': 'function deleteFirst(head,value){if(!head)return null;if(Object.is(head.value,value))return head.next;let p=head;while(p.next){if(Object.is(p.next.value,value)){p.next=p.next.next;break;}p=p.next;}return head;}',
    'wrong-all-matches': 'function deleteFirst(head,value){while(head&&head.value===value)head=head.next;let p=head;while(p&&p.next){if(p.next.value===value)p.next=p.next.next;else p=p.next;}return head;}',
    'wrong-rebuild': 'function deleteFirst(head,value){let result=null,tail=null,removed=false;for(let n=head;n;n=n.next){if(!removed&&n.value===value){removed=true;continue;}const copy={value:n.value,next:null};if(tail)tail.next=copy;else result=copy;tail=copy;}return result;}',
  },
  'dsa-v1-d05-reverse-list': {
    alternative: 'function reverseList(head){let previous=null;for(let current=head;current!==null;){const next=current.next;[current.next,previous,current]=[previous,current,next];}return previous;}',
    'alternative-space-tradeoff': 'function reverseList(head){const nodes=[];for(let n=head;n;n=n.next)nodes.push(n);for(let i=nodes.length-1;i>=0;i--)nodes[i].next=i?nodes[i-1]:null;return nodes[nodes.length-1]??null;}',
    'wrong-copy-values': 'function reverseList(head){let previous=null;while(head){const next=head.next;if(head.value&&typeof head.value==="object")head.value={...head.value};head.next=previous;previous=head;head=next;}return previous;}',
    'wrong-rebuild': 'function reverseList(head){let out=null;for(let n=head;n;n=n.next)out={value:n.value,next:out};return out;}',
    'wrong-drop-suffix': 'function reverseList(head){let previous=null;while(head){head.next=previous;previous=head;head=head.next;}return previous;}',
  },
};
const results = [];
for (const [id, manual] of Object.entries(candidates)) {
  const activity = activityIn(path, id)!.activity;
  for (const [label, source] of Object.entries({
    reference: solutionFor(id)!.solution, starter: activity.code!.starter, ...manual,
  })) {
    const result = await gradePathCode(activity, activity.code!, source);
    const expected = label === 'starter' || label.startsWith('wrong-')
      ? 'needs_revision' : 'verified_pass';
    assert.equal(result.state, expected, `${id}/${label}`);
    results.push({ id, label, state: result.state, expected, outcome: result.code.outcome });
  }
}
assert.equal(results.length, 20);
writeFileSync(process.argv[2], JSON.stringify(results, null, 2), { mode: 0o600 });
console.log('PASS 20 D05 selected verdicts: 7 valid, 3 starters and 10 wrong');
