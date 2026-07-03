// The heavy DOM-animation feature set, isolated in its own module.
//
// This exists purely for code-splitting: lib/motion statically imports the
// lightweight `m` / `LazyMotion` / `AnimatePresence` primitives from
// 'motion/react', and dynamically imports *this* module for the features. If
// the dynamic import pointed straight at 'motion/react' (the same specifier the
// static import uses) Rollup would refuse to split and fold everything into the
// initial bundle. Because this wrapper is only ever reached via the dynamic
// import, tree-shaking keeps `domAnimation`'s code out of the initial chunk and
// emits it as a separate lazy chunk fetched on first animation.
export { domAnimation as default } from 'motion/react';
