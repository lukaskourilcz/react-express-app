# Apple design — application rollout

Requested 11 October 2026. Branch: `codex/apple-design-preview`.
Source: [Emil Kowalski's apple-design skill](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md).

## Application default

Apple is the application-wide design, applied before first paint. The prototype
comparison control and `?design=original` override have been removed. Dark mode
retains the Deep End blue-green background and grain.

The homepage has quiz and `js-double-numbers` sample cards on tablets and desktop
(600px and above), with two accessible dots below the stack to switch cards.
Each new homepage mount randomly selects the first card, kept stable while
interacting. Only a visited coding card loads the editor and task session;
switching cards or resizing to mobile and back retains its draft. The coding
preview shows three bottom-aligned examples; Run and Submit still check the
full suite. Mobile mounts only the quiz, without dots. The task,
Run, Format, Submit, visible tests and hidden server checks reuse Coding's API
and workbench. This is an actual challenge, with normal grading and rewards.
Only the landing card uses 44px icon buttons for Run (play), Submit (send) and
Format (aligned lines), with named tooltips. Full coding exercises retain their
text command buttons.

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
