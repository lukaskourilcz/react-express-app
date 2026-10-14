import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const stack:string[]=[],queue:string[]=[];
for(const value of ['A','B','C']){stack.push(value);queue.push(value);}
const discipline={fromStack:[stack.pop(),stack.pop()],fromQueue:[queue.shift(),queue.shift()]};
assert.deepEqual(discipline,{fromStack:['C','B'],fromQueue:['A','B']});
const counts=[0,1,4,10_000].map(n=>{
 let moves=0;for(let survivors=n-1;survivors>=0;survivors--)moves+=survivors;
 assert.equal(moves,n===0?0:n*(n-1)/2);return {n,moves};
});
const growth=[1,2,3,8,9,64,65].map(n=>{
 let capacity=1,size=0,copies=0;
 for(let i=0;i<n;i++){if(size===capacity){copies+=size;capacity*=2;}size++;}
 assert(copies<2*n);return {n,copies,capacity,totalWork:n+copies};
});
const items:({id:number}|null)[]=[{id:1},{id:2},{id:3}];let head=0;
items[head++]=null;items[head++]=null;
assert.equal(items.length,3);assert.equal(items.length-head,1);
const result={discipline,counts,growth,retained:{slots:items.length,waiting:items.length-head}};
writeFileSync(process.argv[2],JSON.stringify(result,null,2),{mode:0o600});console.log('PASS D04 discipline, exact survivor moves, doubled-capacity sums and retained slots');
