/** Private Promise kernel for the learner engine. QuickJS's installed FFI
 * does not expose its native rejection tracker. Every downlevelled async
 * module and host capability therefore uses this constructor and scheduler;
 * trusted observations subscribe through this closure, never a public then.
 * No native QuickJS promise may cross a capability boundary. */
export const REACT_PROMISE_SOURCE = String.raw`(schedule, report) => {
  'use strict';
  const states = new WeakMap(), rejected = new Set();
  let jobs = [], scheduled = false, flushing = false;
  const enqueue = fn => { jobs.push(fn); if (!scheduled) { scheduled = true; schedule(); } };
  const state = promise => {
    const s = states.get(promise);
    if (!s) throw new TypeError('Not a promise');
    return s;
  };
  const handle = s => {
    if (s.handled) return;
    s.handled = true;
    rejected.delete(s);
    if (s.notified) enqueue(() => report('handled', s.promise, s.value));
  };
  const deliver = (s, reaction) => enqueue(() => {
    const fn = s.status === 'fulfilled' ? reaction.fulfilled : reaction.rejected;
    if (typeof fn !== 'function') {
      (s.status === 'fulfilled' ? reaction.resolve : reaction.reject)(s.value);
      return;
    }
    try { reaction.resolve(fn(s.value)); } catch (error) { reaction.reject(error); }
  });
  const settle = (s, status, value) => {
    if (s.status !== 'pending') return;
    s.status = status; s.value = value;
    if (status === 'rejected' && !s.handled) rejected.add(s);
    for (const reaction of s.reactions) deliver(s, reaction);
    s.reactions.length = 0;
    if (status === 'rejected') enqueue(() => {});
  };
  const adopt = (s, value) => {
    if (value === s.promise) { settle(s, 'rejected', new TypeError('A promise cannot resolve itself')); return; }
    if (value && (typeof value === 'object' || typeof value === 'function')) {
      const other = states.get(value);
      if (other) { subscribe(value, next => adopt(s, next), error => settle(s,'rejected',error)); return; }
      let then;
      try { then = value.then; } catch (error) { settle(s,'rejected',error); return; }
      if (typeof then === 'function') {
        enqueue(() => {
          let used = false;
          try { then.call(value,
            next => { if (used) return; used = true; adopt(s,next); },
            error => { if (used) return; used = true; settle(s,'rejected',error); });
          } catch (error) { if (!used) { used = true; settle(s,'rejected',error); } }
        });
        return;
      }
    }
    settle(s,'fulfilled',value);
  };
  const subscribe = (promise, fulfilled, rejectedFn) => {
    const s = state(promise);
    handle(s);
    const reaction = { fulfilled, rejected: rejectedFn, resolve: () => {}, reject: error => report('callback-error',promise,error) };
    if (s.status === 'pending') s.reactions.push(reaction); else deliver(s,reaction);
  };
  class ControlledPromise {
    constructor(executor) {
      if (typeof executor !== 'function') throw new TypeError('Promise executor must be a function');
      const s = { promise: this, status: 'pending', value: undefined, handled: false, notified: false, reactions: [] };
      states.set(this,s);
      let used = false;
      const resolve = value => { if (used) return; used = true; adopt(s,value); };
      const reject = error => { if (used) return; used = true; settle(s,'rejected',error); };
      try { executor(resolve,reject); } catch (error) { reject(error); }
    }
    then(fulfilled,rejectedFn) {
      const s = state(this);
      handle(s);
      return new ControlledPromise((resolve,reject) => {
        const reaction = { fulfilled, rejected: rejectedFn, resolve, reject };
        if (s.status === 'pending') s.reactions.push(reaction); else deliver(s,reaction);
      });
    }
    catch(rejectedFn) { return this.then(undefined,rejectedFn); }
    finally(fn) {
      if (typeof fn !== 'function') return this.then();
      return this.then(value => ControlledPromise.resolve(fn()).then(() => value),
        error => ControlledPromise.resolve(fn()).then(() => { throw error; }));
    }
    static resolve(value) { return states.has(value) ? value : new ControlledPromise(resolve => resolve(value)); }
    static reject(error) { return new ControlledPromise((_,reject) => reject(error)); }
    static all(values) {
      return new ControlledPromise((resolve,reject) => {
        const list = Array.from(values), out = [], left = { n: list.length };
        if (!left.n) { resolve(out); return; }
        list.forEach((value,index) => subscribe(ControlledPromise.resolve(value), result => {
          out[index] = result; if (--left.n === 0) resolve(out);
        },reject));
      });
    }
    static allSettled(values) { return ControlledPromise.all(Array.from(values, value => ControlledPromise.resolve(value).then(
      result => ({status:'fulfilled',value:result}), error => ({status:'rejected',reason:error})))); }
    static race(values) { return new ControlledPromise((resolve,reject) => {
      for (const value of values) subscribe(ControlledPromise.resolve(value),resolve,reject);
    }); }
    static any(values) {
      return new ControlledPromise((resolve,reject) => {
        const list = Array.from(values), errors = [], left = {n:list.length};
        if (!left.n) { reject(new AggregateError([], 'All promises were rejected')); return; }
        list.forEach((value,index) => subscribe(ControlledPromise.resolve(value),resolve,error => {
          errors[index] = error; if (--left.n === 0) reject(new AggregateError(errors,'All promises were rejected'));
        }));
      });
    }
    static withResolvers() { return deferred(); }
  }
  const deferred = () => {
    let resolve,reject;
    const promise = new ControlledPromise((yes,no) => { resolve=yes; reject=no; });
    return {promise,resolve,reject};
  };
  const flush = () => {
    if (flushing) return;
    flushing = true; scheduled = false;
    try {
      let count = 0;
      while (jobs.length) {
        const batch = jobs; jobs = [];
        for (const fn of batch) {
          if (++count > 10000) throw new Error('Too many pending promise jobs');
          fn();
        }
      }
      for (const s of rejected) if (!s.notified && !s.handled) {
        s.notified = true; report('unhandled',s.promise,s.value);
      }
    } finally { flushing = false; }
  };
  return Object.freeze({ Promise: ControlledPromise, deferred, flush, subscribe,
    isPromise: value => states.has(value), queueMicrotask: fn => enqueue(() => {
      try { fn(); } catch (error) { report('callback-error',null,error); }
    }) });
}`;
