# react-bits components

Animated components adapted from [reactbits.dev](https://reactbits.dev) under
MIT. They use the `motion` package already shipped by the app (see
`lib/motion.tsx` for the lazy-features setup — these components use the tiny
`m.*` primitives so they respect `LazyMotion`).

Kept as source in this folder rather than an npm dep because react-bits is
designed to be copy-paste: it lets us trim any variant we don't need and
change the animation curve without waiting for a release.

Every component in here honours `prefers-reduced-motion`.
