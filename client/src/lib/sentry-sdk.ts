// A closed export boundary lets Rollup remove Replay/profiling and unused SDK
// APIs. Keeping the entire dynamic-import namespace alive retained them even
// though devShark only initializes monitoring and reports exceptions.
export { init, browserTracingIntegration, captureException } from '@sentry/react';
