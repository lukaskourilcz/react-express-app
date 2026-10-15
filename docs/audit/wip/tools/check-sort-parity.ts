// Read-only Node/actual-worker differential report for #422.
// The same37 fixtures are required by test:grading-integrity; any mismatch exits1.
// Bundle with esbuild (platform=node, format=esm, packages=external) and run
// from the repository root after build:react-runner has refreshed the worker.
import { sortParityReport } from '../../../../scripts/coding-sort-contract';
const report = await sortParityReport();
console.log(JSON.stringify(report, null, 2));
if (report.codeError || report.cases.some(check => !check.pass)) process.exitCode = 1;
