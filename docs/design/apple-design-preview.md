# Apple design — application rollout

Requested 11 October 2026. Branch: `codex/apple-design-preview`.
Source: [Emil Kowalski's apple-design skill](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md).

## Application default

Apple is the application-wide design, applied before first paint. The prototype
comparison control and `?design=original` override have been removed. Dark mode
retains the Deep End blue-green background and grain.

The homepage hero restores the original interactive JavaScript question,
`2 ** 3`, with four answers and immediate feedback from the existing SampleCard.
It remains the single sample on every viewport, independent of the selected
learning path. The desktop headline keeps 62.5% of the hero; the question is
capped at 480px and the homepage at its original 1000px. Below 1024px it sits below the headline.

The eight-image carousel prototype is preserved on the local branch
`archive/homepage-feature-gallery-2026-10-11` at `505f7c9`, including original
WebP captures, provenance, components, Storybook and tests. It is not imported,
shipped or requested by the production homepage. The user rejected this direction.

The selected learning path distributes five steps and its checkpoint across
the full panel width, wrapping into two rows on phones. The green
“Start learning {topic}” action sits at the bottom right. Progress-storage
copy is omitted from the homepage. Issues #347–#349 track this refinement;
see `homepage-video-tool-research-2026-10-11.md` for the capture-tool comparison.

Each workbench includes a Big O label and an adjacent info tooltip containing
space targets and explanatory guidance, available by hover, focus and tap.
Only authored targets are called targets.
Submit adds a bounded AST estimate for recognised loops, traversal and sorting;
unsupported constructs report “Cannot determine”. It is advisory, explains its
assumptions, and never changes correctness or XP. Type-only, React and design
work require manual analysis. Extra space is an authored target, not a measured
claim. Feedback becomes stale along with the verdict after an edit.

Issues: #330–#337. Branch: `codex/apple-design-preview`.

## Components affected

| Existing component / layer | Apple variant |
| --- | --- |
| App header and navigation | Floating rounded toolbar; stronger blur; content scrolls underneath; pill-shaped active links |
| App mobile navigation | Frosted sidebar; reversible, critically damped spring; existing focus trap and Escape behavior |
| Home hero and StatItem | System font, optical sizing, tighter display tracking, balanced headline and more breathing room |
| TopicCard | Rounded, quieter surfaces; selected accent ring; existing fins and waves; card stays still |
| SampleCard and RadioCards | Soft inset answer surfaces, immediate press feedback and retained success/error states |
| FadeFinCta, SwimCta and Astryx buttons | Pill-shaped actions and immediate press feedback, with native click behavior |
| Shared panels and cards | Clean surfaces, thin borders and softer elevation replacing the paper edge |
| Astryx dialogs (including SignInDialog and confirmations) | Frosted rounded surface, stronger shadow and dimmed background; existing dialog semantics |
| Existing forms | Softer shared field radii; labels, validation and auth behavior remain in their existing components |
| MotionItem and MotionPop | Critically damped spring defaults; short fades under reduced motion |

The shared tokens also affect existing Coding, Learn, Quiz, Coins and Premium
screens where they consume those tokens. Screen-specific layouts continue to
use their existing components and local CSS. The shared motion helpers and drawer
use the Apple motion defaults throughout the app. No new gesture-driven controls
were added.

Owner refinement: the Apple variant's dark mode retains the original Deep End
blue-green ink background, grain and gradient (`#0c161e` to `#0a1219`), with
matching dark surface tokens. The light palette and Apple component shapes remain
as previewed. The header border remains continuous; the external fade that cut it off was removed.

## Validation

See the Apple rollout entry in `docs/release-acceptance.md` for actual release
checks and browser evidence. The initial prototype was local only; the owner
subsequently requested merging the complete rollout and deploying through Git.
