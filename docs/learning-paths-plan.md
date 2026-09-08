# devShark learning paths: implementation entry point

Prepared 8 September 2026. Documentation and issues only; application implementation has not started in this change.

## Product structure

- Career-oriented learning: **Fullstack / Frontend / Backend → optional Forward Deployed Engineer specialization**.
- Focused learning: **DSA Foundations**, directly accessible with no FDE or base-track enrollment required.
- Both can coexist. They share bounded infrastructure and existing coding execution, with independent content, enrollment, progress and release readiness.

## Read in this order

1. [Research and product decisions](fde-learning-path-research.md)
2. [FDE curriculum and assessment](fde-curriculum.md)
3. [DSA foundations scope and coding inventory](dsa-foundations-plan.md)
4. [Shared engineering implementation plan](fde-implementation-plan.md)

## GitHub backlog

- [FDE epic #128](https://github.com/lukaskourilcz/react-express-app/issues/128)
- [DSA Foundations epic #129](https://github.com/lukaskourilcz/react-express-app/issues/129)

Two epics and nineteen implementation issues. Each issue has a concrete scope, affected files, blockers, acceptance checklist and verification plan.

| Issue | Work package | Blocked by |
|---|---|---|
| [#130](https://github.com/lukaskourilcz/react-express-app/issues/130) | Define shared versioned learning-path contracts for FDE and DSA Foundations | None |
| [#131](https://github.com/lukaskourilcz/react-express-app/issues/131) | Add shared learning-path enrollment, attempts, evidence, drafts and progress storage | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130) |
| [#132](https://github.com/lukaskourilcz/react-express-app/issues/132) | Implement guarded learning-path APIs for FDE and DSA within existing handlers | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#131](https://github.com/lukaskourilcz/react-express-app/issues/131) |
| [#133](https://github.com/lukaskourilcz/react-express-app/issues/133) | Adapt existing graders for FDE and DSA path-bound practical exercises | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#131](https://github.com/lukaskourilcz/react-express-app/issues/131), [#132](https://github.com/lukaskourilcz/react-express-app/issues/132) |
| [#134](https://github.com/lukaskourilcz/react-express-app/issues/134) | Add two-step track and optional FDE selection with safe account sync | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#132](https://github.com/lukaskourilcz/react-express-app/issues/132) |
| [#135](https://github.com/lukaskourilcz/react-express-app/issues/135) | Build FDE overview, module workspace and resumable progress UI | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#132](https://github.com/lukaskourilcz/react-express-app/issues/132), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133), [#134](https://github.com/lukaskourilcz/react-express-app/issues/134) |
| [#136](https://github.com/lukaskourilcz/react-express-app/issues/136) | Implement competency diagnostics and track-specific bridge recommendations | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#132](https://github.com/lukaskourilcz/react-express-app/issues/132), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133), [#135](https://github.com/lukaskourilcz/react-express-app/issues/135) |
| [#137](https://github.com/lukaskourilcz/react-express-app/issues/137) | Author FDE M01–M03 customer discovery, data integration and enterprise boundaries | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133) |
| [#138](https://github.com/lukaskourilcz/react-express-app/issues/138) | Author FDE M04–M08 AI architecture, retrieval, tools, evaluations and security | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133), [#137](https://github.com/lukaskourilcz/react-express-app/issues/137) |
| [#139](https://github.com/lukaskourilcz/react-express-app/issues/139) | Author M09–M10 operations and handoff plus staged FDE capstone | [#133](https://github.com/lukaskourilcz/react-express-app/issues/133), [#137](https://github.com/lukaskourilcz/react-express-app/issues/137), [#138](https://github.com/lukaskourilcz/react-express-app/issues/138) |
| [#140](https://github.com/lukaskourilcz/react-express-app/issues/140) | Integrate specialization progress with Today, Profile and learning continuity | [#135](https://github.com/lukaskourilcz/react-express-app/issues/135), [#136](https://github.com/lukaskourilcz/react-express-app/issues/136), [#139](https://github.com/lukaskourilcz/react-express-app/issues/139) |
| [#141](https://github.com/lukaskourilcz/react-express-app/issues/141) | Add FDE content readiness, reports and privacy-conscious pilot metrics | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#132](https://github.com/lukaskourilcz/react-express-app/issues/132), [#135](https://github.com/lukaskourilcz/react-express-app/issues/135) |
| [#142](https://github.com/lukaskourilcz/react-express-app/issues/142) | Update devShark positioning and EN/CS UX for foundations through specialization | [#134](https://github.com/lukaskourilcz/react-express-app/issues/134), [#135](https://github.com/lukaskourilcz/react-express-app/issues/135) |
| [#143](https://github.com/lukaskourilcz/react-express-app/issues/143) | Verify FDE rollout, legacy compatibility and guarded production readiness | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#131](https://github.com/lukaskourilcz/react-express-app/issues/131), [#132](https://github.com/lukaskourilcz/react-express-app/issues/132), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133), [#134](https://github.com/lukaskourilcz/react-express-app/issues/134), [#135](https://github.com/lukaskourilcz/react-express-app/issues/135), [#136](https://github.com/lukaskourilcz/react-express-app/issues/136), [#137](https://github.com/lukaskourilcz/react-express-app/issues/137), [#138](https://github.com/lukaskourilcz/react-express-app/issues/138), [#139](https://github.com/lukaskourilcz/react-express-app/issues/139), [#140](https://github.com/lukaskourilcz/react-express-app/issues/140), [#141](https://github.com/lukaskourilcz/react-express-app/issues/141), [#142](https://github.com/lukaskourilcz/react-express-app/issues/142) |
| [#144](https://github.com/lukaskourilcz/react-express-app/issues/144) | Add standalone DSA path entry, enrollment and progress without changing career choices | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#131](https://github.com/lukaskourilcz/react-express-app/issues/131), [#132](https://github.com/lukaskourilcz/react-express-app/issues/132), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133) |
| [#145](https://github.com/lukaskourilcz/react-express-app/issues/145) | Author DSA complexity foundations with growth traces and verified reasoning | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133) |
| [#146](https://github.com/lukaskourilcz/react-express-app/issues/146) | Author DSA arrays, maps, stacks, queues and linked-list coding modules | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133) |
| [#147](https://github.com/lukaskourilcz/react-express-app/issues/147) | Author linear/binary search and basic sorting with coding and method checks | [#130](https://github.com/lukaskourilcz/react-express-app/issues/130), [#133](https://github.com/lukaskourilcz/react-express-app/issues/133), [#145](https://github.com/lukaskourilcz/react-express-app/issues/145), [#146](https://github.com/lukaskourilcz/react-express-app/issues/146) |
| [#148](https://github.com/lukaskourilcz/react-express-app/issues/148) | Author basic trees/BSTs and final DSA assessment; verify complete path readiness | [#144](https://github.com/lukaskourilcz/react-express-app/issues/144), [#145](https://github.com/lukaskourilcz/react-express-app/issues/145), [#146](https://github.com/lukaskourilcz/react-express-app/issues/146), [#147](https://github.com/lukaskourilcz/react-express-app/issues/147) |

## Recommended sequencing

Begin with shared #130–#133. Then progress FDE and DSA independently. For FDE, validate one M01/M02 slice with the chooser/workspace before scaling content. For DSA, establish direct entry and foundational content, then searching/sorting, trees and final assessment. #143 is the FDE release gate; #148 is the independent DSA gate and includes the shared release requirements.

A completed document or merged planning PR must not close implementation issues. Keep the feature flags disabled until their respective release gates pass. No requirement to push/deploy after every issue; batch coherent work.

## Verification of this planning change

Source links and high-impact claims were checked during research; repository paths were inspected against the pinned baseline. Documentation cross-links, issue coverage/dependency graph, remote issue read-back and git diff are verified before delivery. No runtime tests, migration, live deployment or educational efficacy validation are claimed.
