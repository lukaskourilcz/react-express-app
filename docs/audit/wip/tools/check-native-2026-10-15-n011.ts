import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { LEARNING_PATHS } from '../../../../lib/learning-paths/catalog';
import { nativeContentHash, nativeGradingHash } from '../../../../lib/learning-paths/audit';
const module=LEARNING_PATHS.find(p=>p.id==='dsa-foundations')!.modules.find(m=>m.id==='dsa-v1-d09')!;
const [l1,l2]=module.lessons;
const codes=module.lessons.flatMap(l=>l.sections.flatMap(s=>s.kind==='code'?[s.code]:[]));
const source=(prefix:string)=>codes.find(s=>s.startsWith(prefix)||s.includes('\n'+prefix))!;
// Only the individually read, authored lesson snippets run here. Learner code never does.
const tree=new Function(source('const tree =')+';return tree;')();
const bst=new Function(source('const bst =')+';return bst;')();
const traversals=new Function(source('const preorder =')+';return {preorder,inorder,postorder};')();
const levelOrder=new Function(source('const levelOrder =')+';return levelOrder;')();
const bstInsert=new Function(source('const bstInsert =')+';return bstInsert;')();
const searchSource=source('const bstSearch =');
const bstSearch=new Function(searchSource+';return bstSearch;')();
const measuredSearch=new Function(searchSource.replace('const value = node.value;', 'visits.push(node.value); const value = node.value;')+';return (root,target)=>{visits=[];const found=bstSearch(root,target);return {found,visits};};'.replace('return (root','let visits=[]; return (root'))();
assert.deepEqual(traversals.preorder(tree),[8,3,9,1,5,6]);
assert.deepEqual(traversals.inorder(tree),[9,3,1,8,5,6]);
assert.deepEqual(traversals.postorder(tree),[9,1,3,6,5,8]);
assert.deepEqual(levelOrder(tree),[8,3,5,9,1,6]);
for(const walk of [...Object.values(traversals),levelOrder] as any[]) assert.deepEqual(walk(null),[]);
const geometry=(root:any)=>{let size=0,height=-1;const leaves:number[]=[];const pending=root?[[root,0]]:[];while(pending.length){const [node,depth]=pending.pop() as [any,number];size++;height=Math.max(height,depth);if(!node.left&&!node.right)leaves.push(node.value);if(node.right)pending.push([node.right,depth+1]);if(node.left)pending.push([node.left,depth+1]);}return {size,height,leaves};};
assert.deepEqual(geometry(tree),{size:6,height:2,leaves:[9,1,6]});
const frames=l1.sections.flatMap(s=>s.kind==='trace'?s.trace.frames:[]);
let queue=[tree],head=0;const frontiers=[queue.map(n=>String(n.value))];while(head<queue.length){const node=queue[head++];if(node.left)queue.push(node.left);if(node.right)queue.push(node.right);frontiers.push(queue.slice(head).map(n=>String(n.value)));}
assert.deepEqual(frames.map(f=>f.cells),frontiers);assert.deepEqual(frames.map(f=>f.counter?.value),[0,1,2,3,4,5,6]);assert.equal(queue.length,6);
assert.deepEqual(measuredSearch(bst,7).visits,[8,3,6,7]);assert.equal(bstSearch(bst,7),bst.left.right.right);
assert.deepEqual(measuredSearch(bst,5),{found:null,visits:[8,3,6,4]});assert.equal(geometry(bst).height,3);
const broken={value:8,left:{value:3,left:null,right:{value:10,left:null,right:null}},right:null};assert.deepEqual(measuredSearch(broken,10),{found:null,visits:[8]});
const trace=l2.sections.flatMap(s=>s.kind==='trace'?[s.trace]:[])[0];
assert.deepEqual(trace.frames.slice(1).map(f=>f.marks?.find(m=>m.role==='active')?.index),[3,1,4,0,5,2,6]);
assert.deepEqual([3,1,4,0,5,2,6].map(i=>Number(trace.frames[0].cells[i])),[2,3,4,5,7,8,9]);
const balanced=(lo:number,hi:number):any=>{if(lo>hi)return null;const value=Math.floor((lo+hi)/2);return {value,left:balanced(lo,value-1),right:balanced(value+1,hi)};};
for(const n of [15,1023]){let chain=null;for(let i=1;i<=n;i++)chain=bstInsert(chain,i);const perfect=balanced(1,n);assert.equal(geometry(chain).height,n-1);assert.equal(geometry(perfect).height,Math.log2(n+1)-1);assert.equal(measuredSearch(chain,n).visits.length,n);assert.equal(measuredSearch(perfect,n).visits.length,Math.log2(n+1));}
const duplicates=bstInsert(bstInsert(null,5),5);assert.equal(duplicates.left,null);assert.equal(duplicates.right.value,5);assert.deepEqual(traversals.inorder(duplicates),[5,5]);
const badDuplicate={value:5,left:{value:5,left:null,right:null},right:null};assert.deepEqual(traversals.inorder(badDuplicate),[5,5]); // Nondecreasing alone misses the strict-left violation.
assert.deepEqual(traversals.inorder(bst),[1,3,4,6,7,8,10,13,14]);assert.deepEqual(traversals.postorder(bst).slice(0,4),[1,4,7,6]);
const read=module.activities.find(a=>a.id==='dsa-v1-d09-l1-read')!;assert.equal(read.lessonId,l1.id);assert.equal(read.verification,'self_reviewed');
const qs=module.activities.flatMap(a=>a.questions??[]).filter(q=>['dsa-v1-d09-q3','dsa-v1-d09-q4'].includes(q.id));assert.equal(qs.length,2);for(const q of qs)assert.equal(q.correct,0);
writeFileSync(process.argv[2],JSON.stringify({checkedRecords:5,records:[...[l1,l2].map(l=>({id:l.id,contentHash:nativeContentHash(l),gradingHash:null})),{id:read.id,contentHash:nativeContentHash(read),gradingHash:nativeGradingHash(read)},...qs.map(q=>({id:q.id,contentHash:nativeContentHash(q),gradingHash:null}))],checks:['authored traversal output and queue-frontier trace','literal BST paths and missing ancestor value','perfect/chain 15 and 1023 actual visited-node counts','duplicate-side counterexample and inorder trace','self-reviewed linked reading; keys unchanged; unit-cost bounds are manual reasoning, not timing']},null,2),{mode:0o600});
console.log('PASS five tree lesson, reading and question records');
