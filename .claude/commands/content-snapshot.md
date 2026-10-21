---
description: Print the devShark Learn and learning-path content model with every count computed from its registry.
argument-hint: [--json]
allowed-tools: Read, Grep, Glob, Bash
---

Print the content snapshot for `$ARGUMENTS` and report it without retyping numbers by hand. Follow `.claude/skills/shark-learning-content-map/SKILL.md`.

1. Confirm `node_modules` exists. If it does not, run `npm ci --no-audit --no-fund` first.
2. Run the snapshot. With `--json` in the arguments, pass it through:

   ```sh
   npm run content:snapshot
   npm run content:snapshot -- --json
   ```

3. Read the output for the words `MISMATCH`, `STALE`, `OUTSIDE` and `INCOMPLETE`. Each names a registry that disagrees with a derived count or a path that fails its validator. Name the owning file from the skill's table and the command that fixes it (`npm run build:coding-index`, `npm run build:curation-registry`, or a content edit followed by `npm run test:paths`).
4. When the request asks for a count that the snapshot does not print, compute it from the owning registry with a one-off read, say so, and suggest adding it to `scripts/content-snapshot.ts`.
5. Return the snapshot output verbatim in a code block, followed by any disagreement found in step 3.

The snapshot reads no database: question counts are the repository's gated bank without the `/dev` overrides, and path storage shows as not checked. Do not present either as the production state. The Learn section matrix is printed only after A1 (#487) adds `shared/learn-sections.ts` and the script is extended. Do not edit files unless the request asks for it.
