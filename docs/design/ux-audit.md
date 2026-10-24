# UX audit, 23 October 2026

This audit reviewed every route at 1280px and 390px, signed out and signed in, including the key states: mid-question, graded, after a coding run, dialogs, locked and Premium. It found 116 problems. Each one is drawn on the screenshot it comes from in the visual plan, and each one names the code that causes it. Epic U and its six child issues track the work, and section 4 lists them.

## Status: completed on 24 October 2026

All six work packages merged: U1 #580, U6 #581, U5 #582, U2 #583, U3 #584 and U4 #586. The closeout branch `claude/ux-closeout` merged the two page headers into `PageHeader`, folded `SignedOutBlock` into `StatePanel inline`, put the glossary term chips and the last compact buttons on the 44px scale, and added `npm run check:design` to CI through `check:public`.

What was decided, and is now the documented default for every new page (`DESIGN_RULES.md` §10–11, `docs/design/design-system.md`):

- The route shell picks one of four widths per route (`pageWidth.ts`); a page sets no page `max-width`, and task columns are 640px.
- Every control is 44px; only a component's own toolbar in `.ss-compact` is 36px, with a 44px hit area.
- `SwimCta` md is the one filled primary on a screen.
- Question screens, the coding workbench, operational headers and every empty, gate or signed-out state each have one shared component.
- Each fact is said once per screen, and the verb is "Sign in".

Open for the owner:

- **Legal wording.** The privacy policy still says "your name" and "shark nickname" (`legal.privacy.friends.see`, `legal.privacy.leaderboards.body`). Agents do not change legal wording.
- **VAT caption.** U5 removed ", before VAT" from the Premium column caption of the `/premium` table; the VAT lines beside the prices stay. Please confirm.
- **Join wording.** The Learn join now reads "Add it to your plan" instead of "Add Software Engineer to your plan", so the section is named once. Please confirm.
- **`/cards`.** It stays its own route. Redirecting it to `/collection` is your decision (social-account-05).
- **Kept exceptions to one primary.** The `/premium` plan pair has two filled buttons; the Profile overview can show two (Save in 'Your name' and Connect GitHub); signed-out `/shop` shows several sign-in prompts, one of them filled.
- **Billing primaries.** The checkout, success and cancel steps draw their one primary as an Astryx `primary` button, not `SwimCta` md. Say whether they should move.
- **Partial targets.** The Profile at 390px is 3,746px tall against a target under 3,000px (social-account-18), and the coding editor starts at y≈368 rather than 320 because the "Show full brief" row holds Format and Reset (coding-01).

The visual plan (the annotated screenshots and their metrics) stays on the owner's machine and is not in the repository. Each finding below keeps its id from that plan.

## 1. Method

- A local production build (`vite preview` on 127.0.0.1) answered every `/api` request from fixtures. Nothing reached devshark.app.
- 167 full-page screenshots were taken at deviceScaleFactor 1, in the light theme with reduced motion. The 390px contexts use touch.
- Each screenshot has DOM metrics: container widths and centring, the size of every button, card fill, repeated text, and wrapping rows that leave empty space.
- A design inventory from the source counted container widths, button sizes and variants, the question and coding container rules, and duplicated copy keys.
- Six area reviewers wrote findings, and a skeptical design lead per area verified them against the screenshots, the metrics and this repository's design contract.
- The design contract (`DESIGN_RULES.md`, `docs/design/`) wins over generic advice everywhere.

## 2. What the audit found

devShark's visual language holds up. The Deep End tokens, the type and the single accent all work. The structure does not:

- **Button sizes.** One mouse meets buttons of 28, 32, 36, 41 and 44px, and the primary is often the smallest button in its row.
- **Container widths.** The code uses 21 different max-widths, while the contract allows three bands.
- **Question screens.** They come in seven column widths and three option designs. On two of them the feedback covers the answers it explains.
- **Coding workbench.** Run and Submit move by up to 154px from one task to the next.
- **Repeated text.** Many screens say the same thing two to five times.

## 3. Decisions taken

The owner asked for every finding to be applied. Where two area reviews proposed different answers, these are the choices:

| Question | Decision |
|---|---|
| Desktop button height | 44px default and 36px compact, changed once in the Astryx size token and the shared button rules, not page by page. Toolbar buttons may be 36px, with a 44px hit area. |
| Billing, checkout and auth card width | One 640px task card (`--ss-task-width`), the same width as the question shell. |
| The primary action on question screens | SwimCta md (44px) as the one primary in the shared QuestionActions row; secondaries are Astryx at 44px. |

### Target system

**Page widths.** These tokens are set in `client/src/styles/astryx-theme.css`, and the route shell picks one per route:

| Token | Width | Used by |
|---|---|---|
| `--ss-width-task` | 640px | the task column inside a page: questions, auth, billing and checkout cards |
| `--ss-width-narrow` | 800px | the route default |
| `--ss-width-standard` | 1000px | two-column pages: home, `/profile`, `/play` |
| `--ss-width-wide` | 1200px | operational screens: `/coding/*`, and a Learn or FDE coding phase while its editor is mounted |

**Button sizes.**

| Size | Height | Used for |
|---|---|---|
| Default | 44px | every page action and form control, on every pointer |
| Compact | 36px | only inside a component's own toolbar, with a 44px hit area |

**One primary per screen.** SwimCta md is the single filled primary on each screen.

**Shared question parts.** QuestionShell, QuestionHeader, AnswerOptionList, QuestionFeedback, QuestionActions and QuestionHint.

**Shared coding frame.** One coding workbench frame wherever a task opens.

**Signed-out state.** One signed-out block: one sentence and one primary "Sign in".

**Copy.** Every fact is said once per screen, and the copy uses the verb "Sign in".

## 4. Work packages

| Id | Work package | Findings | Blocked by |
|---|---|---:|---|
| U1 | Foundations: one button scale, three page widths and a 640px task column | 18 | Nothing |
| U2 | Question system: one shell, one answer list, inline feedback, one action row | 21 | U1 |
| U3 | Coding: a fixed workbench frame, one action row and quieter track lists | 19 | U1 |
| U4 | Learn and FDE: name things once and fit the rows | 18 | U1, U2 |
| U5 | Public pages and money screens: say each fact once and give every task a primary action | 25 | U1 |
| U6 | Social and account: balanced Profile, one name card and one page header | 15 | U1 |

Dependencies block merges, not commits.

Issue numbers (created 23 October 2026): Epic U #572; U1 #573, U2 #574, U3 #575, U4 #576, U5 #577, U6 #578.

## 5. Findings by work package

Each finding keeps the id it has in the visual plan. Severity: High changes what a learner can do or see on every visit, Medium is a visible inconsistency, Low is polish.

### U1. Foundations: one button scale, three page widths and a 640px task column

Set the size and width rules once so every screen inherits them: a 44px default and 36px compact button size in the Astryx size token, the 800/1000/1200px page widths and the 640px task column as tokens, chosen per route in the route shell, and a footer with its own fixed box.

#### money-01: /shop is a 1080px column pinned left in the 1200px box: 60px off-centre and far too wide for its rows

High · centering · effort S

**Problem.** Shop.tsx:584 caps the page stack at 1080px, but nothing centres it inside the 1200px 'wide' route box. At 1280 the left gap is 38px and the right gap is 162px, so the page sits 60px left of centre, unlike every sibling money page. The width is also wasted. In 'How to earn' the detail text ends at x=447 while 'Today: 18 of 400' starts at x=983, a 535px jump on a single row. In the crown card the name ends at x=227 and '1,200 coins' starts at x=974. The invite sentence runs 935px on one line, well past the 68ch measure the rest of the page uses, and the read-only link field is 987px wide for a 30-character URL. The App.tsx comment justifies wide pages with 'cards laid out side by side', but with merchandise paused /shop has no side-by-side cards.

**Change.** Remove '/shop' from isWide (App.tsx:499) so /shop uses the shared 800px route column, centred by the route wrapper, and change Shop.tsx:584 from maxWidth={1080} to width="100%". The merchandise Grid (Shop.tsx:713, minWidth 240, max 3) still fits three columns at 800 (3x245 plus gaps), so reopening merchandise needs no width change. Result: the page is centred, label-to-figure gaps drop from ~535px to ~250px, the invite paragraph fits the 68ch measure and the link field is ~700px.

**Evidence.** `client/src/components/Shop.tsx:584`, `client/src/App.tsx:489-506`, `client/src/components/Shop.tsx:713`, `client/src/components/Rewards.css:73`

#### shell-public-01: Footer and info-page column move between x=38, 138 and 238 from route to route

High · centering · effort M

**Problem.** App.tsx picks the main wrapper width from a hand-kept route list: '/' gets 1000px, the isWide routes 1200px and every other route 800px. BrandFooter renders inside that wrapper, so at 1280 its left edge is at x=238 on /auth/confirmed, /reset-password, /premium/cancel, /premium/checkout, 404 and /topics/*, at x=138 on the home page, and at x=38 on /premium, /privacy and /terms. The header does not move (max-width 1168px, logo at x≈76). The shared Page layout (.ss-info-page, max 920px) starts at x=178 on /premium, /privacy and /terms and at x=238 on the auth, billing, topic and 404 pages, because the 800px wrapper caps it there. Going from Terms to Cancel Premium moves the h1 60px and the footer 200px sideways, and on the 1200px routes the footer is 32px wider than the header above it.

**Change.** (1) Take the footer out of the per-route width: inside the same route Suspense (DESIGN_RULES §8 needs it to arrive with the first page), wrap the keyed route box in the contentMaxWidth div and give <BrandFooter> its own wrapper with max-width 1168px and padding-inline 20px, the same box as the .ss-header pill. The footer then starts at x=76 on every route. tests/browser/first-load.spec.ts must still pass. (2) Give every Page-based route one column: drop /premium, /privacy and /terms from isWide so all .ss-info-page screens sit in the 800px narrow-task column (contract range 560–800), and set .ss-info-page max-width to 800px so the 920 value is gone. Every Page h1 then starts at x=238 at 1280.

**Evidence.** `client/src/App.tsx:494-506`, `client/src/App.tsx:752-770`, `client/src/App.tsx:862`, `client/src/styles/app-shell.css:368`, `client/src/styles/app-shell.css:852-858`, `client/src/components/PublicInfoPages.tsx:11-21`

#### shell-public-02: Primary page actions are 32, 36 or 44px depending on the page

High · button-size · effort M

**Problem.** On a desktop (fine pointer) at 1280: the home hero 'Choose a topic', 'Explore the FDE path' and 'Start learning JavaScript' are 44px fin buttons with 15.2–16px text. The plan table's 'Start free' is Astryx size lg, so 36px with 14px text. The Page screens use the Astryx default md at 32px: 'Go home'/'Go back' on 404, 'Send reset link', 'Send a new link', 'Continue' on /premium/cancel, 'Back to plans', 'Sign in to continue' ×2 and 'Sign in to redeem'. In the sign-in dialog, Google and the submit are 36px and the tabs 28px. The header 'Log in' is 32px next to 44px nav links. On many pages the most important action is the smallest control. A coarse pointer already lifts all of these to 44px (app-shell.css:614), so the mismatch is the desktop view.

**Change.** One page-action size on every pointer: 44px tall, 0 20px padding, 16px/600 text, pill. Add one shared class (e.g. .ss-action, min-height 44px; font-size 1rem) applied through size="lg" plus className to every primary and secondary page action in PublicInfoPages, AuthPages, PremiumBillingPages, PremiumPage plan and voucher cards, ComparisonTable's CTA, the sign-in dialog's Google and submit buttons and SignInButton. Give the dialog's SegmentedControl a 44px track. Keep the 28px size=sm only for in-row utility buttons (e.g. 'Retry' inside a note).

**Evidence.** `client/src/components/PublicInfoPages.tsx:45`, `client/src/components/auth/AuthPages.tsx:199-204`, `client/src/components/auth/AuthPages.tsx:221-223`, `client/src/components/landing/ComparisonTable.tsx:165-177`, `client/src/components/SignInButton.tsx:37`, `client/src/components/auth/SignInDialog.tsx:288-308`, `client/src/styles/app-shell.css:614`

#### social-account-01: Sibling social pages use seven different content widths

High · centering · effort M

**Problem.** App.tsx puts /profile, /collection, /leaderboard, /classroom and /play* in the 1200px wide shell, and every page then picks its own width inside it. The results at 1280: Leaderboard 1200 (x=38), Collection header 1200 (x=38) with its deck at 720 (x=278), Profile and /play 1000 (x=138), /classroom 920 (x=178), /cards and /settings/github 800 (x=238), lobby 620 (x=328), and sign-in gates at 560 and 480. Moving from Play to its lobby or from Profile to Leaderboard moves the left edge by 190 to 290px, so the social area feels like several separate products. The contract has three widths: narrow 560-800, standard 1000 and wide 1200.

**Change.** Map every social or account route to one of the contract's three widths and set it in one place, the route shell, not per page. Narrow 800px: /leaderboard, /collection, /cards, /settings/github, /play/:code (the lobby can stay 620 inside it as the question column). Standard 1000px: /profile and /play (they have two columns). Remove /collection and /leaderboard from isWide. Pages then drop their own max-width rules (.lb, .cd-page, .ss-info-page 920) so header, controls and content share one left edge. Findings 02 and 10 are the two worst cases of this.

**Evidence.** `client/src/App.tsx:495-506`, `client/src/components/Leaderboard.tsx:304`, `client/src/coding/Coding.css:9`, `client/src/components/SharkCards.css:27-28`, `client/src/styles/app-shell.css:368`, `client/src/components/Play.tsx:900-901`

#### social-account-02: Leaderboard is 1200px and left-aligned, so its 4-column table is mostly air

High · centering · effort S

**Problem.** Leaderboard.tsx uses .de-page but never imports DeepEndScreens.css (only Profile, Play, Flashcards, Today, Roadmap, Challenge, CareerRoadmap and Premium do). On a direct load the .de-page 1000px rule is missing, so .de-page.lb reports max-width none and fills the 1200px shell with the h1 at x=38, while Play and Profile are centred at x=138. Once another page has loaded that stylesheet, the board becomes 1000px, so its width depends on navigation history. The table is 1200px: names end near x=330 and 'Correct' starts near x=1060, leaving about 700px of empty row on all 10 rows.

**Change.** Give the board the narrow column: .lb { max-width: 800px; margin-inline: auto } in Leaderboard.css (do not rely on DeepEndScreens.css), and remove /leaderboard from isWide in App.tsx. Header, controls and table then share one centred 800px edge (x=238 at 1280). In the table, set the Correct and Accuracy columns to a fixed 96px each with tabular numbers so the name column takes the rest.

**Evidence.** `client/src/components/Leaderboard.tsx:51`, `client/src/components/Leaderboard.tsx:304-309`, `client/src/components/Leaderboard.css:10-12`, `client/src/components/DeepEndScreens.css:1`, `client/src/App.tsx:495-506`

#### social-account-05: Collection header spans 1200px, but the deck is centred at 720px

High · centering · effort S

**Problem.** On /collection the kicker, h1, lead and tab buttons start at x=38 in a 1200px column, while the Shark Card deck is centred at 720px (x=278-998). Their left edges are 240px apart, so the header looks like it belongs to a different page. On /cards the same deck is 800px (x=238), because Flashcards adds .de-page (max-width 1000px), which overrides .sc-deck's 720px inside the 800px route box. One feature has two widths, two title sizes (32 and 24px) and two footer layouts.

**Change.** Put /collection in the 800px narrow column (remove it from isWide; .cd-page max-width 800px, margin auto), so header, tabs and deck share one left edge. In Flashcards, drop 'de-page' from the non-embedded deck class so the deck is 720px on both routes, centred inside 800. /cards stays as its own route, which the product architecture lists; redirecting it to /collection is an owner decision.

**Evidence.** `client/src/components/Collection.tsx:77-84`, `client/src/components/Flashcards.tsx:198`, `client/src/components/SharkCards.css:27-28`, `client/src/coding/Coding.css:9`, `client/src/App.tsx:495-506`

#### social-account-06: Profile buttons come in 28, 32 and 44px, and the main CTA is the smallest

High · button-size · effort S

**Problem.** At 1280 the Profile has four button heights: 28px (See what Premium includes, Connect GitHub, Sign out on all devices, Delete my account), 32px (Choose your path, Generate, Save), 44px (Protect today and tomorrow, identity buttons, tabs) and 46px (the Role row). The only primary in the GitHub card, 'Connect GitHub', is size sm at 28px, smaller than the grey secondary 'Choose your path' at 32px. Every sm and md button is under the 44px target with a mouse; the 44px floor only applies under pointer:coarse.

**Change.** One card-action size on Profile: Button size='md' with min-height: 44px for every card action, via one scoped rule (.de-page .ss-panel .astryx-button { min-height: 44px }), as SharkCards.css already does for .sc-deck__controls. Connect GitHub and Save keep the primary variant at the same height as their secondaries. Then all 9 card actions share one 44px height.

**Evidence.** `client/src/components/coding/GithubGardenCard.tsx:187-192`, `client/src/components/Profile.tsx:841-846`, `client/src/components/Profile.tsx:858`, `client/src/components/SharknameCard.tsx:248-259`, `client/src/components/paths/LearningPathsCard.tsx:218-219`, `client/src/components/SharkCards.css:35`

#### learn-05: Big O lesson: Back and Start stretch to 800px while the article is 726px

Medium · spacing-alignment · effort S

**Problem.** On /learn/big-o with a lesson open, the ghost 'Back' button is 800x32 with its label floating in the middle of the page (label at x=622), and 'Start the questions' is 800x32 too. The article is 726px (72ch), so the button's right edge overhangs the text by 74px. Cause: .lp-page is a flex column (align-items: stretch) and both Buttons sit directly in it, while .lp-lesson caps itself at 72ch.

**Change.** Put Back at the top-left as a 44px ghost link with a chevron ('← Big O introduction'), styled like the FDE module page's kicker link. At the end, one row inside the 72ch column: the note 'Reading is optional. It records no progress and earns no XP.' on the left, 'Start the questions' as SwimCta md on the right. Both get align-self:flex-start (or a wrapping row), so neither stretches.

**Evidence.** `client/src/components/learn/LearnLesson.tsx:19-27`, `client/src/components/paths/LearningPaths.css:15-22`, `client/src/components/paths/LearningPaths.css:250`

#### money-09: The voucher card is 920px wide for a 480px form; fold it into one row

Medium · whitespace-width · effort S

**Problem.** 'Have a voucher?' is a full-width 920x213 card whose form is capped at 30rem (480px). Its content uses 55% of the width and leaves 390px empty on the right, while label, hint, field and button stack into four rows. With billing on, this secondary path takes more height than either plan card (197px).

**Change.** When billing is on (voucherLeads false), make the voucher a single row without a card, under the small print. Put 'Have a voucher?' (h2, .ss-premium-section-title) on the left, then the code field (flex 1, max 320px) and 'Redeem voucher' (secondary) inline, with the 'Spaces and dashes are ignored.' hint under the field. That is ~110px instead of 213px. Below 600px the field and button stack. While the voucher leads (billing off), keep the current card.

**Evidence.** `client/src/components/PremiumPage.css:85-89`, `client/src/components/PremiumVoucher.tsx:224-243`, `client/src/components/PremiumPage.tsx:163`

#### money-10: The purchase flow changes width at every step: 920, then 800, then a 640px card on a 719px lead

Medium · container-size · effort S

**Problem.** /premium is a 920px .ss-info-page article in the 1200px box, with the h1 at x=178. /premium/checkout is clamped to the 800px route box, with the h1 at x=238; its .ss-checkout-card max-width of 960px never applies. /premium/cancel puts a 640px .ss-billing-card in that 800px column, left-aligned, under a 719px lead paragraph, so the card is narrower than the text above it and leaves 160px empty on the right. Each step moves the left edge and changes the card and footer width.

**Change.** Remove '/premium' from isWide (App.tsx:500), so /premium, /premium/checkout, /premium/success and /premium/cancel all share the 800px route column. Delete the conflicting caps .ss-billing-card max-width:640px (PremiumBillingPages.css:4) and .ss-checkout-card max-width:960px (:24), so cards fill the column. The plan pair fits at 2x392px and the comparison table at 800px.

**Evidence.** `client/src/App.tsx:495-506`, `client/src/styles/app-shell.css:368`, `client/src/components/PremiumBillingPages.css:4`, `client/src/components/PremiumBillingPages.css:24`

#### shell-public-03: Footer wraps to 2 rows on 800px routes and to 4 rows (212px) on phones

Medium · whitespace-width · effort S

**Problem.** The footer row needs ≈818px (legal links 371 + Instagram 178 + toggles 245 + gaps), so in the 800px column 'Switch to dark mode' and 'Turn sound on' drop to a second row by themselves (238–482), leaving ≈555px of that row empty and making the footer 70px tall instead of 32. This is the footer of most routes, since 800px is the default width. At 390 it takes 4 rows (y 4553–4765): four links, 'Cancel Premium' alone, 'Follow us on Instagram.', then the toggles. On desktop the toggles are 32px tall with 11.5px text and a square-ish radius-inner, unlike every other button.

**Change.** With the fixed 1168px footer from shell-public-01, the desktop footer fits on one row. Fix it on its own as well: shorten the visible labels to 'Dark mode'/'Light mode' and 'Sound on'/'Sound off' (≈185px for both) and keep the full 'Switch to dark mode' in aria-label. The row then fits even in 800px. Make the toggles pills at min-height 36px on desktop and 44px on coarse pointers, as the other buttons are. At <760px the toggles move to the drawer (shell-public-15) and the footer keeps two rows: legal links, then the Instagram line.

**Evidence.** `client/src/components/BrandFooter.tsx:35-78`, `client/src/styles/app-shell.css:325-366`, `client/src/i18n/translations.ts:330-332`

#### shell-public-10: Desktop icon buttons are 28–32px: header leaderboard/Premium/coins and dialog close

Medium · button-size · effort S

**Problem.** Signed in, the desktop header's right slot holds three ghost size="sm" icon buttons (trophy, diamond, coins) at 28×28px, 2px apart (x 867–955), beside a 56px account widget and 44px nav links. The coins glyph renders as a plain green dot that reads like a status light. The sign-in and cookie dialogs close with a 32×32 icon button. All four are below the 44px target on a desktop pointer. Coarse pointers already get 44px.

**Change.** Header: size="lg" (44×44) with 20px glyphs and gap 4px, or text links styled as .ss-navlink ('Leaderboard', 'Coins'). Draw the coins entry with the real CoinIcon at 20px so it does not read as a dot. Dialog close: 44×44 on every pointer (the hit area can grow with padding while the glyph stays 16px). Keep the tooltips and aria-labels.

**Evidence.** `client/src/App.tsx:592-626`, `client/src/components/auth/SignInDialog.tsx:253`, `client/src/components/CookieConsentDialog.tsx:81`

#### shell-public-13: Auth and billing task cards: different widths (560/640/800) and h1 at two heights

Medium · container-size · effort S

**Problem.** The auth, billing and 404 pages share the Page layout with one task card under the header. The card is 560px on /auth/confirmed and /reset-password (.ss-auth-page), 640px on /premium/cancel (.ss-billing-card) and 800px on /premium/checkout, where .ss-checkout-card's max-width 960px overrides the 640. The checkout card holds one error banner and one button in an 800×160 box. Only some Pages pass a kicker: 404, checkout, privacy and terms have none, so their h1 sits at y=165 while the others sit at y=194, and the title moves 29px between sibling pages.

**Change.** Add one token, --ss-task-card: 640px, and use it as max-width for .ss-auth-page, .ss-billing-card and .ss-checkout-card. The Stripe form fits in 640. Give every Page a kicker so the h1 is always at the same y: 404 → 'Page not found', checkout → 'devShark Premium', privacy/terms → 'Legal'. Show the checkout 'choose a plan first' state as an inline note plus 'Back to plans' without the wrapping card (canvas → one panel).

**Evidence.** `client/src/components/auth/Auth.css:82`, `client/src/components/PremiumBillingPages.css:4`, `client/src/components/PremiumBillingPages.css:24`, `client/src/components/PublicInfoPages.tsx:11-21`, `client/src/components/PublicInfoPages.tsx:45`

#### social-account-09: Leaderboard period control is 28px and the scope note splits controls from the table

Medium · button-size · effort S

**Problem.** At 1280 the four period segments are 28px tall (SegmentedControl md), under the 44px target, while the topic select beside them is 44px, so one row mixes two heights. The scope sentence ('Ranked by correct answers… Five answers put you on the board.') is a 704px paragraph between the controls and the table, which separates the controls from what they filter; the control row itself is 46.6% empty.

**Change.** In the 800px column from finding 02: put the scope sentence under the h1 as the page lead (operational header: h1, scope, compact actions). One control row below it: the segmented control left at 44px (size lg or a min-height token on .lb-controls) and 'Topic [All topics]' right at 44px. The table follows directly.

**Evidence.** `client/src/components/Leaderboard.tsx:311-345`, `client/src/components/Leaderboard.css:14-20`

#### social-account-12: /play has two equal green primaries, and its toggles are 28px

Medium · button-size · effort S

**Problem.** 'Create multiplayer match' (154,802,621x36) and 'Join →' (828,364,293x36) are both primary lg, so the page has no single main action; at 390 they are two full-width green bars 334px apart. The question-count and time-limit ToggleButtonGroups are size sm at 28px on desktop, between 44px topic pills and 36px CTAs, which gives three heights in one form. The count group's label 'questions' is a 12px suffix after the toggles, while 'Time limit' and 'Categories' are labels above their groups.

**Change.** Keep Create as the only primary. Join is secondary until the input holds a 6-character code, then primary. Every form control at 44px: ToggleButtonGroup size md plus min-height: 44px, and both CTAs at 44px. Put 'Questions' as a label above its toggles, like 'Time limit', and place the two groups side by side in one row at 900px and wider.

**Evidence.** `client/src/components/Play.tsx:337-371`, `client/src/components/Play.tsx:376-391`, `client/src/components/Play.tsx:432-440`

#### learn-18: Learn controls under 44px on desktop: runner icons, switcher, roadmap cells, level nodes

Low · button-size · effort S

**Problem.** At 1280 the runner's close and flag icon buttons are 28x28 (close is the only way out of a level), the section switcher items 32px, the roadmap's track control 28px, the roadmap part cells 31px and the level nodes 40x40. The coarse-pointer floor lifts them to 44px on touch only, so mouse and keyboard users get targets under the contract's 44px goal.

**Change.** Use size='md' (44px hit area, icon stays 18px) for the runner's close and flag IconButtons. Use the lg segmented control with min-height 44px at every width for the section switcher and the track control. Raise level nodes to 44px (tests to 52px). Keep the 31px visual on roadmap part cells and add a 44px hit area via padding/::before.

**Evidence.** `client/src/components/learn/LessonRunner.tsx:709`, `client/src/components/learn/LessonRunner.tsx:732-737`, `client/src/components/learn/SectionSwitcher.tsx:75-80`, `client/src/components/CareerRoadmap.tsx:272-279`, `client/src/components/RoadmapTree.tsx:251-257`, `client/src/styles/app-shell.css:614-624`

#### money-06: Some money-screen buttons sit next to taller fields, and the Rewards.css 44px claim is not true

Low · button-size · effort S

**Problem.** On desktop, Astryx md buttons are 32px by design (app-shell.css:608-613 keeps the desktop density on purpose and lifts controls to 44px only on coarse pointers). That is not the defect. The defect is mixed heights inside one row. The invite row pairs a 44px .ss-input with a 32px 'Copy link' that aligns to the field's top edge, so the button looks like it is floating. Rewards.css:1-3 also says 'Every control is at least 44px tall', which is false on desktop and misleads the next editor.

**Change.** Set `align-items: stretch` on .rw-invite__field (Rewards.css:95) so Copy link matches the field's height, or render the link with the Astryx TextInput so both are 32px on desktop and 44px on coarse pointers. Reword the Rewards.css header to the real rule: 'controls are 44px on coarse pointers (app-shell.css floor)'. Do not change button heights page by page: any move to 44px desktop buttons must happen app-wide, in the Astryx size token.

**Evidence.** `client/src/components/Rewards.css:1-3`, `client/src/components/Rewards.css:95-101`, `client/src/components/ReferralInvite.tsx:105-112`, `client/src/styles/app-shell.css:608-624`

#### social-account-23: Classroom card is 920px for one button row and one sentence

Low · whitespace-width · effort S

**Problem.** /classroom puts two 32px buttons (Create a classroom, Join with a room code) and one sentence in a 920px .ss-info-card (178,310,920x141), with about 560px empty to the right of the buttons. (The 47px h1 is allowed here: /classroom is a public positioning page.)

**Change.** Drop the card: put the two buttons (44px) directly under the lead and fold the note into the lead as one sentence. If a card stays, make it fit its content: note on the left, buttons on the right in one row, max-width 720px.

**Evidence.** `client/src/components/PublicInfoPages.tsx:23-25`, `client/src/styles/app-shell.css:368-381`


### U2. Question system: one shell, one answer list, inline feedback, one action row

Build QuestionShell, QuestionHeader, AnswerOptionList, QuestionFeedback, QuestionActions and QuestionHint, and move Quiz, Challenge, Daily, the Learn level runner, placement, Big O lessons and Shark Cards onto them.

#### learn-02: Level runner: answers jump 30px on grading and the feedback card hides the learner's own pick

High · states · effort M

**Problem.** Before answering, option 1 sits at y=331 (Web Developer, 1280); after grading it is at y=361: the keyboard tip under the list unmounts on reveal and the bottom-anchored list (marginTop:auto) slides down. The feedback card is then absolutely positioned over the column (374,399 528x180) and covers options 2-4, including the wrong option the learner picked (y=423). At 390 the card (24,365 338x222) covers options 2-4 the same way. The learner sees the correct answer but not their own red pick, and the contract rule 'Quiz answers remain in a stable region' is broken. The same root cause is reported for Quiz in questions-01/02; the fix should be one shared feedback slot.

**Change.** Keep the tip's line reserved on reveal (render it with visibility:hidden, or swap its text for the result line) so options never move. Render feedback in normal flow directly under the options in a reserved slot: desktop min-height 132px, max-height 40vh with internal scroll; the result line, the explanation, and a SwimCta md 'Continue' (44px, right-aligned). At 390, use a bottom sheet anchored to the viewport, with the column given padding-bottom equal to the sheet height and the picked option scrolled into view (block:'nearest'), so both the red pick and the green answer stay visible. Keep aria-live='polite' and move focus to Continue as feedbackActionRef does today; no slide animation under prefers-reduced-motion.

**Evidence.** `client/src/components/learn/LessonRunner.tsx:767-772`, `client/src/components/learn/LessonRunner.tsx:806-810`, `client/src/components/learn/LessonRunner.tsx:812-829`

#### learn-03: The Learn question column changes width between intro, questions, skill check and FDE checks

High · container-size · effort M

**Problem.** One level attempt uses two column widths: the 'Before you start' intro is 640px (x=318) and the question screen is 560px (x=358), so the close button jumps 40px right when 'Start the level' is pressed. The skill-check placement also runs at 640px, the FDE knowledge check at the full 800px with a native radio list, and Quiz at 600px. Learn options hard-code a 2px border and 8px radius (.rm-option) while the shared RadioCard uses 1px and --radius-element. The gap from the code block to option 1 depends on question length (50px for a one-line question, 56px on the Big O question) because the options are bottom-anchored.

**Change.** Give every Learn question surface one 640px task column: the level intro, questions, results, skill-check placement, Big O lessons and FDE knowledge checks. 640 is the intro's width today, sits inside the contract's 560-800px narrow band, and matches the shared question width proposed in questions-03 and the auth/billing card width in shell-public-09. Use one header row on every one (close left, hearts or progress in the middle, flag right) at the same x. Top-anchor the options 24px under the question, and let RadioCard own the border and radius (delete the border and border-radius in .rm-option).

**Evidence.** `client/src/components/learn/LessonRunner.tsx:479`, `client/src/components/learn/LessonRunner.tsx:705`, `client/src/components/Roadmap.tsx:1747`, `client/src/components/Roadmap.css:336-352`, `client/src/components/paths/ActivityViews.tsx:209-250`, `client/src/components/Quiz.tsx:1221`

#### learn-04: Six different buttons do the one 'start / continue' job across Learn

High · button-size · effort M

**Problem.** The primary 'go' action has a different shape on every Learn screen: 'Continue — Level 1' is a 171x44 green SwimCta pill; 'Start the level' is a 640x41 yellow block with a 13.6px radius; the runner's feedback 'Continue' is a second yellow block (302x41 at 390); 'Start the questions' after a Big O lesson is an 800x32 full-width Astryx primary; Big O's '1. Complexity Basics' is a 32px primary pill; the FDE hub's 'Continue where you left off' is 203x44; 'Skill check' is a 122x36 outlined button with a 13.6px radius. .rm-accent-btn and .rm-skillcheck-cta break the contract that buttons are pills, and the 32, 36 and 41px ones are under the 44px target goal.

**Change.** One primary action per screen, always SwimCta md: 44px pill, auto width with 160px min, in the brand accent (or the topic colour through textOnColor() where contrast passes). Replace .rm-accent-btn (intro Start, feedback Continue/Finish, Retry) with SwimCta and stop stretching it to the column width; right-align it under the content it finishes. Make 'Skill check' an Astryx secondary size lg (44px pill) and delete .rm-skillcheck-cta's radius/border rules. Big O lesson buttons: SwimCta for lesson 1, secondary lg for lesson 2.

**Evidence.** `client/src/components/Roadmap.css:175-196`, `client/src/components/Roadmap.css:362-373`, `client/src/components/Roadmap.tsx:886-891`, `client/src/components/Roadmap.tsx:1055`, `client/src/components/learn/LessonRunner.tsx:520-527`, `client/src/components/learn/LessonRunner.tsx:844-873`, `client/src/components/learn/LearnLesson.tsx:27`, `client/src/components/Roadmap.tsx:1905-1906`

#### questions-01: Graded feedback covers the answers it explains, and only /daily marks the wrong pick in text

High · states · effort M

**Problem.** After grading, Challenge floats a success/error Banner (absolute, bottom:72, var(--shadow-high)) over the options: 528x144 at y=383, covering options 2-4 including the pick it grades. The Learn level runner floats a white sheet (box-shadow 0 10px 40px rgba(0,0,0,.35), radius 8px hard-coded) 528x180 at y=399 over options 2-4, so the wrong pick (option 2, y=423) is hidden behind the text explaining it. At 390 the Challenge banner is 338x224 and the Learn sheet 338x222; both hide options 2-4. /daily is the only screen that puts the verdict inline under the options (710x84) and labels the options in text ('correct answer', 'your pick'). Challenge and Learn mark the wrong pick by colour only (error border and tint, plus a shake in Learn), which breaks the contract rule 'Status uses text/icon plus semantic color'. Quiz gives no per-question feedback by design (graded at submit), so it is out of scope here.

**Change.** Adopt the /daily pattern as one shared QuestionFeedback block: (1) graded options keep their position and get the existing success/error tones plus a trailing glyph and text mark (check + 'Correct answer', cross + 'Your pick'), reusing daily.correctOption / daily.yourPick; (2) the verdict Banner (Astryx Banner, status success/error, title + explanation) renders in normal flow directly below the option list, inside the question panel, never absolute; (3) on grading, focus moves to the verdict (Daily already does this with verdictRef) and the next action appears in the shared action row (questions-05). Delete the absolute wrappers in Challenge.tsx and LessonRunner.tsx and the rgba(0,0,0,.35) shadow. The options do not move because content is only added below them, which satisfies 'Success: no answer reflow'; if the explanation is long, <main> scrolls (smooth scroll only without prefers-reduced-motion). Impact: the player sees the pick, the key and the reason together, the same way on Challenge, Learn and Daily.

**Evidence.** `client/src/components/Challenge.tsx:1085-1121`, `client/src/components/Challenge.tsx:1046-1052`, `client/src/components/learn/LessonRunner.tsx:812-835`, `client/src/components/learn/LessonRunner.tsx:778-781`, `client/src/components/DailyQuestionPage.tsx:211-241`

#### questions-02: Learn level options drop 30px at the moment of grading

High · states · effort S

**Problem.** In a Learn level the options sit at y=331/393/455/517. After grading they are at y=361/423/485/547: a 30px shift exactly when the learner looks for the result. The keyboard tip is rendered only while !revealed && !answerError, and the options are pinned with marginTop:auto inside a column that is centred, so removing the 12px margin and 15px tip line moves the group down. This breaks 'Success: no answer reflow' and checklist item 8, 'answer positions stay stable'.

**Change.** Keep the hint row in the layout in every state: render the same element with visibility:hidden (or aria-hidden empty text) after grading, or give it a fixed min-height of 27px. Better, render the shared QuestionHint (questions-16) under the options on every runner with a reserved height. Impact: no jump at the moment of feedback. Effort: a one-line change.

**Evidence.** `client/src/components/learn/LessonRunner.tsx:806-810`, `client/src/components/learn/LessonRunner.tsx:772`, `client/src/components/learn/LessonRunner.tsx:704`

#### questions-03: Every question screen uses a different container width and surface

High · container-size · effort M

**Problem.** At 1280 the same job gets five containers. Quiz is a 600px bordered card. Challenge is a 544px card inside a 560px column, with a 4px brand top border. Daily is a 760px .ss-info-card. Learn is a bare 560px column with no surface. Shark Cards on /cards is 800px: .sc-deck asks for 720px, but .de-page (max-width 1000px) on the same element wins. The answer rows are 542, 494, 710, 560 and (card) 758px wide. Moving from Daily to Quiz to Challenge, the question jumps between widths and between card and no card.

**Change.** Add a token --ss-question-width: 640px (inside the contract's 560-800px narrow band) in client/src/styles/astryx-theme.css and a QuestionShell component: width 100%, max-width var(--ss-question-width), margin 0 auto, one .ss-panel surface (1px border, radius var(--radius-container), padding 24px desktop / 16px phone), no accent top border. Quiz, Challenge, Daily and LessonRunner render inside it; drop their own maxWidth 600/560/680 and .ss-daily max-width 760. For Shark Cards, remove de-page from the non-embedded deck so the 720px rule applies, or move the deck to the same token. Result: the answer rows are 592px everywhere at desktop and 322px at 390.

**Evidence.** `client/src/components/Quiz.tsx:1213-1223`, `client/src/components/Challenge.tsx:912-925`, `client/src/components/Challenge.tsx:987-999`, `client/src/components/learn/LessonRunner.tsx:704`, `client/src/components/DailyQuestion.css:3`, `client/src/components/Flashcards.tsx:198`, `client/src/components/SharkCards.css:27`, `client/src/components/DeepEndScreens.css:1`

#### questions-04: Answer options come in two designs with different heights, gaps, weights and selection colours

High · consistency · effort M

**Problem.** Quiz, Challenge and Daily use RadioCard padding 2: 48px rows, regular-weight body text and a 26px number chip. The gap between rows is 4px in Quiz (VStack gap 1) and 8px in Challenge and Daily. Learn adds .rm-option on top: 52px rows, a 2px border, an 8px hard-coded radius (the contract says radio cards use the radius tokens), .95rem/600 text, a 24px chip with a 4px radius, and a 10px gap. Its selected border is the track colour (purple on Big O, yellow on JavaScript) where the others use the brand accent. The four-option block is therefore 204, 216 or 238px tall.

**Change.** Extract one AnswerOptionList (a RadioCardGroup of RadioCard padding 2, min-height 48px, 8px gap, 26px chip with radius var(--radius-inner), body text that turns semibold when selected, selection in var(--brand-accent) / var(--brand-accent-soft)) and use it in Quiz, Challenge, Daily and LessonRunner. Delete the .rm-option rules and the inline accent border override. The track colour can stay on the level pill and progress bar. The graded marks from questions-01 belong to this component. Impact: identical rows and a fixed 216px block for four single-line options on every screen.

**Evidence.** `client/src/components/Quiz.tsx:1401-1436`, `client/src/components/Challenge.tsx:1031-1075`, `client/src/components/DailyQuestion.css:9-10`, `client/src/components/learn/LessonRunner.tsx:767-803`, `client/src/components/Roadmap.css:336-357`

#### questions-05: The main action changes size, position and colour on every question screen

High · button-size · effort M

**Problem.** At 1280 with a mouse: Quiz Next is a 32px pill at the right below the card; Challenge Submit/Next question is a 32px pill at the right below the card; Daily Check answer is a 32px pill at the left inside the card; Learn Continue is a 41px full-width button inside the floating sheet, filled with the track colour (#f7df1e yellow for JavaScript); Shark Cards Got it is a 44px pill in the centre. The Learn button is 41px at 390 as well, under the 44px floor even on touch. The contract says primary CTAs read var(--brand-accent); Learn hard-codes the track colour through accentFill.

**Change.** One QuestionActions row directly under the QuestionShell (16px gap): secondary actions on the left (Previous, Exit, Share) as Astryx secondary/ghost, and the primary on the right as Astryx variant primary with min-height 44px at every pointer type (size lg or the .sc-deck__controls min-height rule), filled with var(--brand-accent). Use it for Quiz Next/Submit, Challenge Submit/Next question, Daily Check answer/Practice, LessonRunner Continue/Finish (replace .rm-accent-btn + accentFill) and Shark Cards Got it. Impact: the next step is always in the same place, size and colour, and every target meets 44px.

**Evidence.** `client/src/components/Quiz.tsx:1450-1476`, `client/src/components/Challenge.tsx:1135-1155`, `client/src/components/DailyQuestionPage.tsx:243-263`, `client/src/components/learn/LessonRunner.tsx:866-874`, `client/src/components/learn/LessonRunner.tsx:198-203`, `client/src/components/Roadmap.css:362-372`, `client/src/components/Flashcards.tsx:245-254`

#### questions-06: Quiz answers jump between questions while the card stays 776px tall and half empty

High · container-size · effort M

**Problem.** The Quiz card is flex 1 1 auto with maxHeight 82%, so at 1280 it is always 600x776. The options are meant to be anchored at the bottom (marginTop:auto), but they render directly under the question text instead: q1 options start at y=182, q2 (with a code block) at y=245.6, a 64px jump from one question to the next. Below the answers the card is empty: 377px on q1 (49% of the card) and 313px on q2; at 390, 353px and 266px. Next sits 394px below the last answer. This breaks the contract rules 'Quiz answers remain in a stable region' and 'answer positions stay stable', and leaves half the screen as a blank white card.

**Change.** Inside the QuestionShell from questions-03, give the question region a fixed block and anchor the options to it. The panel gets min-height: min(520px, 100% - action row), and the question block (meta row + text + code) gets min-height 200px and scrolls internally past max-height 40vh. The option list then starts at the same y on every question, and the action row (questions-05) sits 16px under the panel. Remove maxHeight 82% and the stretching flex:1 from the card. Impact: answers stay at one y between questions, and roughly 250px of dead card disappears at 1280.

**Evidence.** `client/src/components/Quiz.tsx:1238-1250`, `client/src/components/Quiz.tsx:1278-1290`, `client/src/components/Quiz.tsx:1405`

#### questions-07: Quiz hides the site chrome, but timed Challenge runs and Learn levels keep the header and footer

Medium · visual-noise · effort M

**Problem.** Quiz enters a focus mode (showChrome = !isDev && !(quizActive && isQuiz)), so its card starts at y=16 with no header or footer. A timed Challenge run and a Learn level keep the full nav header and the footer (Premium, Privacy, Terms, Cookie settings, Cancel Premium, Instagram, dark mode, sound) about 90px below the action, so the question starts at y=16, 174 or 112 depending on the mode, and a timed run shows about 15 unrelated controls. Challenge has no exit control of its own during a run, so the nav is currently the only way out.

**Change.** Generalise focus mode: Challenge (phase 'playing') and LessonRunner call the same setQuizActive/onActiveChange so App hides the header and footer during a live run. Before that, add an Exit control to Challenge's QuestionHeader (44px ghost icon button that opens the existing confirm, as Quiz's Exit quiz does) so nothing gets trapped, and keep the RouteErrorBoundary reset. Impact: fewer distractions in timed play, and the question sits at the same y in every mode.

**Evidence.** `client/src/App.tsx:532`, `client/src/App.tsx:808-811`, `client/src/App.tsx:862`, `client/src/components/Challenge.tsx:908-925`, `client/src/components/learn/LessonRunner.tsx:704`

#### questions-09: Each runner lays out its question header differently: Quiz icons squeeze the code, Learn icons are 28px, Challenge cannot report

Medium · hierarchy · effort M

**Problem.** Quiz puts the counter and waterline inside the card and the hint and report icons (2x44px) in a flex row beside the question text. That narrows the code block to 446px while the answers are 542px (224px vs 320px at 390), and the icons (y=118-162) don't line up with the first text line. Learn puts exit and flag at 28x28 on desktop (Astryx size sm; under the 44px goal), then a level pill and a right-aligned 'Question 1 of 8'. Challenge puts score, timer and fins above the card and has no report control. The difficulty badge appears only on Challenge and Daily.

**Change.** One QuestionHeader inside the shell. Row 1: progress on the left (counter + WaterlineProgress), run status on the right (timer, fins or hearts). Row 2: category tag and difficulty badge on the left; icon buttons (hint, report, exit) on the right at 44x44 (Astryx IconButton size md with the touch-target floor, not sm). The question text and the code block then span the full panel width, aligned with the options. Add ReportDialog to Challenge so every mode can report a question, and show the difficulty badge on all runners or on none. Impact: the same scan path on every question, code as wide as the answers, and accessible targets.

**Evidence.** `client/src/components/Quiz.tsx:1263-1276`, `client/src/components/Quiz.tsx:1296-1395`, `client/src/components/learn/LessonRunner.tsx:707-750`, `client/src/components/Challenge.tsx:928-985`, `client/src/components/Challenge.tsx:1013-1016`, `client/src/components/DailyQuestionPage.tsx:195-198`

#### questions-10: Challenge setup squeezes 16 topic pills into a 462px column next to a half-empty score panel

Medium · whitespace-width · effort M

**Problem.** The .de-challenge-grid (1.4fr / minmax(260px,.6fr)) gives the hero panel 520px, so the 16 pills wrap to 6 rows in 462px (the last row holds only Security) and to 8 rows at 390. The 260x276 Top scores aside ends at y=396 and leaves 363px of empty column beside the hero. In each leaderboard row the score sits about 15px above the name. All 16 pills start in the selected green tint, while Quiz setup shows neutral pills, a Select all link and 'Show all categories' in one centred 680px panel.

**Change.** Use the Quiz setup layout: one centred column (680px, the same as Quiz setup) with the h1 and lead outside the panel; inside, the topic pills at 630px content width (3-4 rows), a Select all / Clear link on the label row, then Start (SwimCta, 44px). Move Top scores below as a compact list (rank, name, score right-aligned on one baseline, max 5 rows) or into a single line 'Top score today: calmShark1 · 42' with a link to the leaderboard. Impact: about 150px less height, no dead column, and both setup pages look alike.

**Evidence.** `client/src/components/Challenge.tsx:748-790`, `client/src/components/DeepEndScreens.css:3`

#### questions-11: /daily says its title twice, says 'nothing is recorded' twice, and leaves a 71px gap

Medium · duplicate-text · effort S

**Problem.** The kicker 'devShark QUESTION OF THE DAY' sits directly over the h1 'JavaScript question of the day', followed by a bold date and a two-line lead. The header is 209px tall at 1280 and 278px at 390, so on a phone the question card starts at y=390. The lead says 'nothing here counts towards scores or streaks', and after answering the card repeats 'This is practice: the answer is checked on the server and nothing is recorded.' Between the action buttons (end y=906) and that note (y=978) there are 71px of empty space: the empty share-status paragraph keeps min-height 1.4em and adds two flex gaps.

**Change.** Make the date the kicker ('Friday, 23 October 2026'), keep the h1, drop the separate date line, and cut the lead to one sentence: 'One question a day from a different track. No account needed; nothing is recorded.' Delete daily.practiceNote. Render .ss-daily__status only while it has a message, or make it an absolutely positioned role=status region so it takes no space. Impact: the header is about 70px shorter (the question rises toward the fold on phones), with no repeated message and no dead band.

**Evidence.** `client/src/components/DailyQuestionPage.tsx:66-71`, `client/src/components/DailyQuestionPage.tsx:248-252`, `client/src/components/DailyQuestion.css:34`, `client/src/i18n/translations.ts:2135-2139`, `client/src/i18n/translations.ts:2147`

#### questions-12: Quiz results: summary and review grid are misaligned, the cards are ragged, and every card nests a second box

Medium · consistency · effort M

**Problem.** The summary panel is 680px (x=298) but the review heading and grid are 800px (x=238), so their left edges are 60px apart. The 2-column grid uses align-items:start, so paired cards end at different heights (324 vs 365px in row 1, 464 vs 488px in row 2). Each card has a 4px success/error top border and nests a bordered, muted explanation box: 10 cards plus 10 inner boxes plus 10 code blocks, the panel-inside-card pattern the contract asks to avoid. The summary actions are 32px (New quiz primary, Review answers ghost).

**Change.** Put the summary and the grid in one 800px column (the summary panel at full width, or both at 680px with the grid going single-column). Set .quiz-review-grid align-items: stretch. Render the explanation as plain secondary text under a 1px var(--ss-card-line) rule instead of a bordered box. Use the 44px QuestionActions row for New quiz / Review answers. Impact: an aligned, calmer results page with about a third fewer borders.

**Evidence.** `client/src/components/Quiz.tsx:1038`, `client/src/components/Quiz.tsx:1088-1097`, `client/src/components/Quiz.tsx:1160-1172`, `client/src/components/Quiz.css:25-30`, `client/src/components/Quiz.css:43-44`

#### questions-13: /today has no visible h1, repeats one line on every card, and its cards differ in height

Medium · duplicate-text · effort S

**Problem.** The h1 'Today' is screen-reader only, so the page opens on a 'TODAY'S TARGET' kicker inside a 118px panel (checklist item 1 requires a visible h1); the empty header still leaves 28px above the panel. 'Next up on your path.' appears on all three cards, so it says nothing. The 'START HERE' chip stacks above the title, making that card 95px tall against 71px for the others. The summary '0 to finish · 0 to review · 3 new' repeats what the section heading 'New material' and the cards already show.

**Change.** Show a visible h1 'Today' with '0/3 done' right-aligned on the same row, and fold the progress bar and day-change note under it (no separate panel). Show the reason line only when it differs between items in a section. Put 'Start here' as an inline tag after the title, so all cards are 71px. Drop the summary line, or keep only non-zero counts. Impact: about 120px shorter, one clear heading, no repeated lines.

**Evidence.** `client/src/components/Today.tsx:286-291`, `client/src/components/Today.tsx:296-317`, `client/src/components/Today.tsx:360-364`, `client/src/components/Today.tsx:264-266`, `client/src/i18n/translations.ts:1090`

#### questions-15: Quiz setup: Difficulty wraps to two rows in a 305px half-column

Medium · whitespace-width · effort S

**Problem.** Questions and Difficulty sit side by side in an auto-fit minmax(220px,1fr) grid. Difficulty gets 305px, so Advanced and Mixed wrap to a second row, although the five pills need only 445px and the panel's content width is 630px. The Questions half leaves 342px of empty space beside its pills. There is also a 47px empty gap between 'Show all categories' (ends y=500) and the 'Questions' label (y=548).

**Change.** Stack the two groups full width, each as one row: the label (fixed 96px column) on the left, the pills on the right. 'Questions 10 20 30 40 50' needs 272px and 'Difficulty Basics Easy Progressive Advanced Mixed' needs 445px, so both fit on one 630px row. Use the panel's normal 20px section gap instead of the extra space under 'Show all categories'. Impact: one row per setting, about 50px shorter, easier to scan.

**Evidence.** `client/src/components/Quiz.tsx:967-990`

#### questions-18: Phones: Quiz uses a 12px gutter and every runner puts the main action somewhere else

Medium · mobile · effort S

**Problem.** At 390 the Quiz route uses 0.75rem (12px) side padding, so its card is 362px at x=12, while every other route uses the contract's 16px gutter (354px at x=16). The primary action is a 55px pill on the right (Quiz Next), a 71px pill on the right (Challenge Submit), a full-width 320px button (Daily Check answer, via .ss-info-actions > * flex 100%), a full-width 354px row above Previous/Next (Shark Cards Got it), or a 41px full-width button inside the floating sheet (Learn).

**Change.** Remove the isQuiz padding exception in App.tsx so every route has a 16px gutter on phones (keep the Quiz focus-mode top padding if wanted). In the shared QuestionActions row below 560px: the primary goes full width at 44px as the last row (thumb zone), and secondary actions (Previous / Exit / Share) form a two-column row above it. Apply it to every runner. Impact: the same gutter and the same thumb target on every question screen.

**Evidence.** `client/src/App.tsx:736-740`, `client/src/components/Quiz.tsx:1450-1476`, `client/src/components/Challenge.tsx:1135`, `client/src/components/DailyQuestion.css:44-46`, `client/src/components/SharkCards.css:31-35`

#### questions-19: Live question screens have no h1, and the page titles of sibling screens use four different styles

Medium · hierarchy · effort S

**Problem.** The active Quiz, a Challenge run and a Learn level render no heading at all (the metrics find zero headings, and the code has no h1 in those phases), which fails checklist item 1 'One visible h1' and leaves screen-reader users without a heading to jump to. Where there is a title, it changes style between sibling screens: Quiz setup and Challenge use a 32px green Kicker-as-h1 with a wave underline, Daily a 47px ink h1, Shark Cards a 24px/600 Astryx Heading, and Today a screen-reader-only h1. The Quiz results page goes from h1 '5 / 10' straight to h3 'Review your answers'.

**Change.** Give the QuestionHeader (questions-09) an h1 that names the run in the page-title role at one compact size (for example 'Quiz · Question 1 of 10', 'Biggest Shark Challenge', 'Level 1 · Values & Math', set in --ss-type-title or 1.25rem/700) and drop the separate visually-hidden legend that repeats the counter. For the setup and info pages, use one editorial header (kicker + h1 + one line) at one h1 size for Quiz, Challenge, Daily, Today and Shark Cards. Make 'Review your answers' an h2. Impact: a predictable heading outline and one title style across the question area.

**Evidence.** `client/src/components/Quiz.tsx:1263-1291`, `client/src/components/Challenge.tsx:908-925`, `client/src/components/learn/LessonRunner.tsx:705-750`, `client/src/components/Quiz.tsx:930`, `client/src/components/Challenge.tsx:754`, `client/src/components/DailyQuestionPage.tsx:69`, `client/src/components/Flashcards.tsx:202`, `client/src/components/Today.tsx:289`

#### social-account-19: Flashcard: 'Got it' is the primary before the answer is shown; Previous and Next are 745px apart

Medium · hierarchy · effort S

**Problem.** Before the card is turned, the only green primary is 'Got it' (608,608), which removes the card (with Undo), while the next step, 'Show the answer', is a tinted button inside the card (259,534,758x44). Previous (x=238) and Next (x=983) sit 745px apart at the card's edges, so moving through the deck takes two long mouse trips. The card's 300px min-height leaves about 150px empty under a one-line question.

**Change.** Front: 'Show the answer' is the visual primary (primary fill on .sc-card__turn); Got it shows as secondary. Back: Got it becomes primary. Put Previous/Next together: 'Card 1 of 4' on the left and '‹ Previous  Next ›' on the right of one row, all 44px, with Got it on the row below. Keep the stable 300px card (stable answer geometry).

**Evidence.** `client/src/components/Flashcards.tsx:232-257`, `client/src/components/SharkCards.css:32-35`, `client/src/components/SharkCards.css:64-65`

#### questions-14: Shark Cards (/cards) stacks five labels before the question and leaves the card half empty

Low · duplicate-text · effort S

**Problem.** Before one card the legacy /cards page shows the kicker 'Saved questions', the h1 'Shark Cards', a two-sentence lead, 'Card 1 of 4' and a 'QUESTION' side label. The card has min-height 300px, so 161px of it is empty between the question (ends y=373) and 'Show the answer' (y=533). Previous, Got it and Next use secondary, primary and secondary pills in a 1fr/auto/1fr grid, and at 390 Got it jumps to its own full-width row above them. Severity is low because /collection is now the entry point in the navigation and the embedded deck there drops the header; this applies to old /cards links.

**Change.** Keep the h1 and one line of lead; drop the kicker and the front-side 'Question' label (keep 'Answer' on the back, where it helps). Move 'Card 1 of 4' into the card's meta row, right-aligned. Remove min-height 300px so the card hugs its content. Use the questions-05 action row: Previous / Next as secondary on the left, Got it as the 44px primary on the right, with the same phone layout as questions-18. Impact: the question starts about 100px higher with less chrome.

**Evidence.** `client/src/components/Flashcards.tsx:198-216`, `client/src/components/Flashcards.tsx:245-256`, `client/src/components/SharkCards.css:31-46`, `client/src/i18n/translations.ts:761-777`

#### questions-16: Keyboard hints differ in wording and placement, and Challenge has none

Low · consistency · effort S

**Problem.** Quiz says 'Keys 1–4 to answer · Enter to continue' in xsm text; Learn says 'Tip: press 1–4 to answer' at .75rem. Challenge supports the same digits (to select) and Enter (to submit, then continue) but shows no hint. Daily has no digit shortcut at all. The keys also act differently: in Learn a digit grades at once, while in Quiz and Challenge it only selects, so a single shared string would be wrong.

**Change.** One QuestionHint component under the option list, desktop and fine-pointer only (reuse the .quiz-keyboard-tip media query), with a reserved line height (see questions-02) and a shared format: 'Press 1–4 to {verb} · Enter to {next}', with verbs per runner (answer / select, continue / submit). Add it to Challenge. Either add digit selection to Daily or leave it without a hint. Fold roadmap.keyboardTip into the shared keys.

**Evidence.** `client/src/i18n/translations.ts:382`, `client/src/i18n/translations.ts:829`, `client/src/components/Quiz.tsx:1440-1444`, `client/src/components/learn/LessonRunner.tsx:806-810`, `client/src/components/Challenge.tsx:700-724`, `client/src/components/Quiz.css:63-66`


### U3. Coding: a fixed workbench frame, one action row and quieter track lists

Give the coding workbench one viewport-tall frame on every task and host, one 44px action row with Submit as the single SwimCta, and turn the track lists into two-column hairline rows.

#### coding-01: The coding workbench changes height on every task, so the editor and Run/Submit move

High · container-size · effort M

**Problem.** The brief sits inside the editor pane, above the editor, and has no height limit. So every task gets a different workbench. At 1280px the editor starts at y=484 (Digit sum), 533 (Greeting component), 562 (Typed slug) and 638 (Two sum). Run and Submit move with it, to y=988, 1037, 1066 and 1142. Both panes are 931, 980, 1009 and 1085px tall. Going from one task to the next shifts every control by up to 154px. On a 900px-tall laptop viewport, Two sum's Run/Submit row starts 242px below the fold. The output pane uses contain: size and takes the editor pane's height, so it changes with every brief too. Digit sum shows about 330px of empty pane under its 6 checks.

**Change.** Give the workbench one fixed frame. (1) .cd-workbench__grid at 1024px and up: height: clamp(560px, calc(100dvh - var(--header-h) - 48px), 900px). (2) Make the left pane a 3-row grid (grid-template-rows: auto 1fr auto). Row 1 is the brief zone: max-height 176px (title line plus about 5 lines of prompt), overflow-y: auto, tabindex=0, aria-labelledby the title, and a 24px bottom fade with a 'Show full brief' text toggle that removes the cap. Row 2 is the editor at flex 1, scrolling inside CodeMirror. Row 3 is the 44px action bar. (3) The right pane fills the same frame height through its own internal scroll, which it already has. After this the editor top sits at about y=320 and Run/Submit at the pane foot on every task, track and mode. Reduced motion is not affected, because nothing animates.

**Evidence.** `client/src/coding/CodingWorkbench.tsx:1063-1098`, `client/src/coding/CodingWorkbench.tsx:1216-1227`, `client/src/coding/Coding.css:242-256`, `client/src/coding/Coding.css:283-304`

#### coding-02: The action row mixes five button styles and two heights, and Submit, the primary action, is the smallest

High · button-size · effort S

**Problem.** The command row at 1280 has: Run (Astryx secondary md, 32px, 14px text); Submit (SwimCta sm, 32px tall, 5px 8px padding, 12.48px text, 59px wide); Format, Reset and Solution (ghost, 32px); Hint (secondary pill that looks disabled until a run); and Report (ghost icon, 44x44). That is five treatments and two heights in one row. The primary action has the smallest text and the smallest hit area. The rule '.cd-workbench .ss-swim-cta--sm { --swim-cta-height: 32px }' shrinks Submit on purpose on fine-pointer desktops. Six of the seven controls miss the contract's 44px target goal.

**Change.** Make one row, 44px tall. Left group: Run as an Astryx secondary with min-height 44px, then Submit as SwimCta size md (44px, 10px 18px padding, 0.95rem text). Delete the 32px --swim-cta-height override in Coding.css:364-366. Middle group: Hint and Solution as ghost buttons at min-height 44px. Move Format and Reset into a slim 36px editor header above CodeMirror, as 44x44 hit-area icon buttons with tooltips (the same icons compactCommands already uses). Keep Report at the far right. Submit is then the only filled control, as DESIGN_RULES section 8 asks ('Use SwimCta for … coding Submit'). Every control in the row has the same height. Focus rings stay the Astryx and fin-button ones.

**Evidence.** `client/src/coding/CodingWorkbench.tsx:1101-1155`, `client/src/coding/Coding.css:347-356`, `client/src/coding/Coding.css:364-366`, `client/src/components/landing/LandingKit.tsx:142-158`

#### coding-03: The same editor opens at three widths and four heights depending on where the task is opened

High · container-size · effort M

**Problem.** App.tsx gives /coding/* a 1200px column and leaves /learn/* (Learn level runner and FDE path) at 800px. The FDE page's own .lp-page asks for max-width 1200px but is clipped to 800 (metrics: lp-page maxWidth 1200px, rendered 800). So CodingWorkbench in mode='lesson' gets an editor about 430px wide (58% of 800, less padding) instead of 662px on /coding. The FDE code activity does not use the workbench. It has its own .lp-split (5fr/7fr, breakpoint 60rem = 960px rather than 1024px) and Editor minHeight 320. Editor minimum heights across the app are 160 (landing), 280 (narrow), 320 (FDE) and 480 (/coding). A learner meets the same coding surface at three sizes with three split ratios. The Learn and FDE captures show only the 800px column, not the editor in it, so this finding rests on the code.

**Change.** One code shell for every place a task opens. (1) Add a layout signal, for example a useWideContent(true) hook that App reads, which the LessonRunner coding phase and the FDE code activity set while their editor is mounted. contentMaxWidth goes from 800 to 1200 only for those phases, so reading and quiz phases keep the contract's narrow ~800px task width. (2) Add one token, --cd-editor-min: 480px at 1024px and up and 280px below, used by both Editor call sites. (3) Make ActivityViews use the .cd-workbench__grid columns (58/10px/42, 1024px breakpoint) and the coding-01 frame. That gives one editor width, height and split everywhere.

**Evidence.** `client/src/App.tsx:495-506`, `client/src/components/learn/LessonRunner.tsx:145-150`, `client/src/components/learn/LessonRunner.tsx:532-536`, `client/src/components/paths/ActivityViews.tsx:468-479`, `client/src/components/paths/LearningPaths.css:209-213`, `client/src/coding/CodingWorkbench.tsx:1222`

#### coding-05: 'Continue' appears 14 times on /coding and 5 more on each track page, all green, all at 0 progress, with the same Premium note under each

High · duplicate-text · effort S

**Problem.** On /coding (signed in, 1280) there are 14 green 44px SwimCta 'Continue' buttons: the next-challenge card, 3 debugging paths and 10 evolving challenges. Every row reads '0 of N completed', so 'Continue' is the wrong verb, and no action on the page stands out as primary (visual QA check 2: 'Primary action is obvious and unique'). Each row also repeats the same 2–3-line Premium note. 'Level 1 comes with the free plan. Premium opens the levels after it.' appears 3 times, and 'Stages 1, 2 and 3 come with the free plan. Premium opens the stages after them.' appears 10 times. Each track page repeats the pattern: /coding/javascript, signed out, opens with 5 green Continue buttons and 5 identical Premium notes above the task list.

**Change.** Keep exactly one SwimCta per screen. On /coding that is the 'Your next challenge' Continue. Track pages get no SwimCta in the paths list. Rows use FadeFinCta, the contract's 'quieter fin' (DESIGN_RULES section 8 keeps a fin on the evolving action), labelled by state: 'Start' at 0 progress, 'Continue' when partly done, 'Review' when complete. It stays at the 44px target, and the row keeps its meter and 'N of M' line. Say the Premium rule once, in each section's intro column under the lead, where there is about 300px of free space: 'Level 1 of every path, and stages 1–3 of every project, come with the free plan. Premium opens the rest.' On the rows themselves, keep only the existing Badge 'Premium' next to the progress line, so 'Premium' still appears in text as the contract requires. This removes 13 duplicate notes on /coding and 4 on each track page.

**Evidence.** `client/src/components/coding/CodingSection.tsx:220-225`, `client/src/components/coding/CodingSection.tsx:276-282`, `client/src/components/coding/CodingSection.tsx:310`, `client/src/components/coding/CodingSection.tsx:537`, `client/src/coding/Coding.css:76`, `DESIGN_RULES.md:237-240`

#### coding-06: Track task lists are 1200px bordered cards, 70 or 56px tall, with the status about 1,100px from the title

High · whitespace-width · effort M

**Problem.** On /coding/javascript each task is a bordered, rounded 1200x70 card. The content is a title such as 'Digit sum' (about 73px wide) and a 'Level 1' line, with the status 'Open' or 'Premium' about 1,100px away at the right edge. 222 such cards make the page 18,368px tall, and the capture stopped at 16,000. On /coding/algorithms, rows with a 'DSA Foundations · Level N' line are 70px and rows without one are 56px, so the list rhythm changes from row to row. Each row is a card of its own (1px border, radius), which goes against the contract's 'canvas → one panel → rows'. The home page's project and technique lists already use hairline rows.

**Change.** (1) From 1024px up, set .cd-rows to display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 32px, giving each column 584px. (2) Make each row one line, min-height 48px: title, then the level as quiet inline meta ('· Level 1', 0.82rem secondary), then the status right-aligned. All rows are then the same height whether or not they have meta. (3) Replace the per-row border and radius with border-bottom: 1px solid var(--ss-card-line), as .cd-project and .cd-technique already do. This roughly halves the page to about 8,000px, keeps title and status within about 500px of each other, and removes 222 cards. Keep the 'Premium' status text. It is required, and it now sits close to its title.

**Evidence.** `client/src/coding/Coding.css:185-208`, `client/src/components/coding/CodingSection.tsx:187-212`

#### coding-04: Output tabs change order and count by track, and React alone opens on an empty Preview

Medium · consistency · effort S

**Problem.** Right-pane tabs: JavaScript has Results, Console, Resources. TypeScript has Results, Types, Console, Resources. React has Results, Console, Preview, Resources. The track-specific tab goes second on TypeScript and third on React, so Console sits at x=877 on JS and React but x=951 on TS, and Resources moves between x=967, 1041 and 1055. React alone opens on Preview (useState(isReact ? 'preview' : 'results')): a bordered 320px box with only 'Nothing rendered yet'. Every other track opens on the checks the learner has to pass.

**Change.** Fix the order to Results, Console, then one track slot (Types or Preview), then Resources, with Solution and Approaches after when they exist. Shared tabs then keep their x position on every track. Open React on Results like the other tracks, and switch to Preview automatically after the first Run that renders. Before a run, show the preview as one line ('Run to see the component.') with no 320px .cd-frame min-height until there is something to render.

**Evidence.** `client/src/coding/CodingWorkbench.tsx:185`, `client/src/coding/CodingWorkbench.tsx:703-717`, `client/src/coding/Coding.css:434`

#### coding-07: The track directory leaves Algorithms alone on a second row, 67% empty

Medium · whitespace-width · effort S

**Problem.** The four track entries use repeat(3, minmax(0, 1fr)). JavaScript, TypeScript and React fill row 1 (190px tall), and Algorithms sits alone in row 2: 400 of 1200px used, 66.7% empty, adding 212px of height. The Techniques grid further down has the same shape: 9 groups in 2 columns leave the last row 51.3% empty.

**Change.** Set .cd-track-directory to repeat(4, minmax(0, 1fr)) from 1051px up (each entry 300px wide, with 18px padding and a 30px icon, leaving about 220px for the name, count, waterline and blurb). Keep 2x2 from 701 to 1050px and the existing single column at 700px and below. All four tracks then sit in one row of about 210px. For Techniques, use repeat(3, minmax(0, 1fr)) from 1051px up, so 9 groups fill a 3x3 grid with no orphan.

**Evidence.** `client/src/coding/Coding.css:54`, `client/src/coding/Coding.css:84`, `client/src/coding/Coding.css:87-93`

#### coding-08: The collapsed Challenge run is a 1200x127 card holding only a centred title and a '+'

Medium · whitespace-width · effort S

**Problem.** Collapsed, the challenge-run planner is a full .cd-pane, 1200x127. Its toggle button stacks 'Challenge run' and a '+' vertically in the centre (flex-direction: column; justify-content: center). The content is 146px wide inside a 1150px button (9.7%). It reads as an empty card, never says what a run is, and puts a 127px band between the tracks and the paths. At 390 it is 328x93 for the same two glyphs.

**Change.** Make it a one-row disclosure, 64px tall, without the card. Use border-block: 1px solid var(--ss-card-line), like the project rows below it. Left: the 'Challenge run' title (1.05rem/700) and one line of secondary text ('Pick tracks and a time; we line up the tasks.'). Right: an Astryx secondary button 'Plan a run' at min-height 44px, with aria-expanded and aria-controls moved onto it. That saves about 60px, explains the feature, and keeps the same keyboard behaviour.

**Evidence.** `client/src/components/coding/ChallengeRunPlanner.tsx:171-186`, `client/src/coding/Coding.css:559-567`

#### coding-09: Evolving challenges hide half their rows in a nested scroll box

Medium · states · effort S

**Problem.** When a list has more than 5 entries it becomes a scroll region (cd-project-list--scroll) sized to its first 5 rows. Evolving challenges show 5 of 10, and the other 5 (y=1967–2558 in layout) scroll inside a box in the middle of a 3,000px page, under where the FullStack card sits. overscroll-behavior: contain holds wheel and trackpad scrolling inside the box, and nothing visible says there are 5 more (the scrollbar shows only while scrolling, by design).

**Change.** Remove the inner scroller. Render the first 5 rows, then an Astryx ghost button at 44px: 'Show all 10 challenges', which expands the list in place, moves focus to row 6, and changes to 'Show fewer'. With coding-05's lighter rows (no repeated note, about 80px each), the full list of 10 fits in about 800px, so the toggle may not be needed at all.

**Evidence.** `client/src/components/coding/CodingSection.tsx:242-265`, `client/src/coding/Coding.css:65`

#### coding-10: The sign-in hint repeats on home, in the paths intro, in the planner and in every task brief

Medium · duplicate-text · effort S

**Problem.** Signed out, /coding shows 'Sign in to keep your progress. Signed out, you can run and check the free tasks, but no pass is recorded.' as a 1200x42 tinted bar. Its text is 691px wide, so 58% of the bar is empty. The paths intro on the same screen adds 'Sign in to save progress.', and opening the planner adds 'Sign in to plan a run.' Every task brief repeats the long note between the brief and the editor (623x39 text at 1280, a 60px block at 390), which pushes the editor down 49px (see coding-01). The header's 'Log in' is visible the whole time.

**Change.** Say it once per screen, next to the action it affects. /coding: keep a single line in the header under the subtitle and drop 'coding.evolving.signIn' from the paths intro. Workbench: remove the note from the brief. After a signed-out Submit, the verdict says 'Passed. Sign in to record this pass.' with a 44px 'Log in' button, which is the moment it matters. The planner keeps its note, because it gates that form.

**Evidence.** `client/src/components/coding/CodingSection.tsx:339`, `client/src/components/coding/CodingSection.tsx:262`, `client/src/coding/CodingWorkbench.tsx:1096`, `client/src/i18n/translations.ts:35`, `client/src/i18n/translations.ts:1601`

#### coding-11: The task title is 16.8px, the same size and green as its breadcrumb

Medium · hierarchy · effort S

**Problem.** The task h1 ('Digit sum') sits inline after the meta 'JavaScript · Foundations · Level 1'. Both are green, both 1.05rem (16.8px). Only weight 800 and a 2px rule separate them. The track page h1 is 32px, so opening a task drops the main heading to a breadcrumb-sized label. At 390 the line wraps, and the title moves to row 2 with its rule (row 2 is 58% empty).

**Change.** Make two lines. Line 1: the meta as an eyebrow, 0.8rem/600, var(--color-text-secondary), not green. Line 2: the h1 at 1.35rem/700 in var(--color-text-primary), with the difficulty badge inline after it. Drop the 2px separator rule. The brief header is then a fixed 2 lines (about 52px) at every width, which coding-01's fixed brief zone needs, and the title reads as the page heading.

**Evidence.** `client/src/coding/CodingWorkbench.tsx:1063-1071`, `client/src/coding/Coding.css:296-302`

#### coding-12: At 390px the output tabs shrink and clip their labels

Medium · mobile · effort S

**Problem.** The tab strip is display:flex with overflow-x:auto, but .cd-tab keeps the default flex-shrink: 1, so the tabs squeeze rather than scroll. At 390 the React tabs are 67, 71, 70 and 109px, below their natural 80, 86, 84 and 136px: 'Console' is cut to 'Consol' and the Resources badge is cut in half. TypeScript after a run clips 'Results 0/5', 'Types 5' and 'Console' the same way. This breaks visual QA check 7: no clipped long copy.

**Change.** Add flex: none to .cd-tab, so the strip scrolls rather than clips, with a 16px mask-image fade on the overflowing edge. Under 600px: padding 8px, font-size 0.9rem, and hide the Resources count badge (the tab label is enough). Four plain tabs then measure about 66+72+70+88px plus 12px of gaps, 308px, which fits the 328px strip. With badges after a run, the strip scrolls cleanly. Keep the 44px min-height.

**Evidence.** `client/src/coding/Coding.css:374-390`

#### coding-13: Below 1220px the action bar becomes six unlabelled icons, and Report wraps to its own row

Medium · mobile · effort S

**Problem.** compactCommands switches on at width < 1220px, not only on phones, so 1024–1219px laptops with the two-pane layout get it too. Run, Submit, Format, Reset, Hint and Solution all become 44px icon-only buttons. Submit becomes an Astryx primary circle rather than the SwimCta the contract names for coding Submit. At 390 the Report flag then wraps to a row of its own (that row is 86.6% empty, and the bar is 96px tall). The two actions a learner needs most carry no words.

**Change.** At every width keep Run (secondary) and Submit (SwimCta md) labelled, both 44px, as the first two items. Collapse Format, Reset, Hint, Solution and Report into a single 44x44 'More actions' Astryx menu button at the right (menu items keep their disabled-reason tooltips as descriptions). At 390 that is one 44px row, Run and Submit taking about 260px and More 44px, with no orphan row. On 1024–1219px, show Hint and Solution as ghost text too, since there is room.

**Evidence.** `client/src/coding/CodingWorkbench.tsx:156-157`, `client/src/coding/CodingWorkbench.tsx:1101-1153`, `client/src/coding/Coding.css:347-356`

#### coding-14: The mobile waiting state stacks three notices before its one button

Medium · visual-noise · effort S

**Problem.** At 390 a task opens in its waiting state. Under the brief come: a blue sign-in note (60px), a beige 'This challenge needs an editor, so it is waiting for a bigger screen.' note (39px text), a grey 3-line paragraph about saving, the 'Use the editor on this screen' button, and then a row with only the Hint and Solution icons and the flag, which do nothing useful without an editor. That is 349px of notices and controls in three background treatments, for one decision.

**Change.** Merge them into one .cd-note--warn: 'This task works best on a bigger screen. Your code is kept.' followed inline by the 44px secondary button 'Use the editor here'. Remove the sign-in note (coding-10) and the pendingDesktopNote paragraph. Hide the command row (Hint, Solution, Report) until the editor is open. The waiting state then fits in about 120px.

**Evidence.** `client/src/coding/CodingWorkbench.tsx:1198-1212`, `client/src/coding/CodingWorkbench.tsx:1096`, `client/src/i18n/translations.ts:1670-1672`

#### coding-16: Track filters take three rows of chrome, and the chip row leaves 42% of its width empty

Medium · whitespace-width · effort S

**Problem.** On every track page at 1280, the filter area has three parts. A technique chip row (7 pills, 38–730px, so 42% of the 1200px row is empty). Below it, a second row with the search box and three selects. Then 'Showing 222 of 222', which repeats the header's '0 of 222 passed' total even when nothing is filtered. Together they take 167px (y=892–1059) before the first task. At 390 the same .cd-search wraps into 4 rows (200px): rows 3 and 4 each hold one select and are 49% and 51% empty.

**Change.** At 1024px and up, use one filter row. Search at flex 1 1 320px, then four 44px selects (Technique, Difficulty, Length, Format) at 160px each. That is about 992px, so it fits in 1200. The technique select already exists for under 760px, so use it at every width and drop the chip row. Show 'Showing N of M' only when a filter narrows the list. Under 760px, make .cd-search a grid: search across both columns, then the four selects in a 2x2 grid (grid-template-columns: 1fr 1fr). That is 3 rows (148px) with aligned edges.

**Evidence.** `client/src/components/coding/CodingSection.tsx:540-560`, `client/src/coding/Coding.css:155-161`, `client/src/coding/Coding.css:588-598`

#### coding-15: Each test case is a bordered card inside the output card, with 'Expected:' repeated on every one

Low · visual-noise · effort M

**Problem.** The Results panel draws every check as its own bordered, rounded card with a 3px left rule, inside the output pane card: 13 nested cards on Two sum and 6 on Digit sum. Every card repeats a bold 'Expected:' (13 times on Two sum), and edge cases repeat '· edge case' (5 times). Cards are 63 or 84px tall depending on whether a description exists. This goes against the contract's 'Avoid panel-inside-card-inside-card'.

**Change.** Render checks as one divided list: rows separated by 1px var(--ss-card-line) hairlines, no per-row border or radius. Give each row a fixed 48px status column (—, Pass, Fail in text plus colour, so status is not shown by colour alone), the call in mono, and the expected value inline ('→ 76'; after a run, '→ 76 · got undefined'). Show the description as a quiet second line only when it exists. Mark edge cases with one small .cd-tag 'edge'. Put the 'Expected' wording once, as a visually hidden column label for screen readers.

**Evidence.** `client/src/coding/Coding.css:405-420`, `client/src/coding/CodingWorkbench.tsx:803-819`

#### coding-17: The FullStack feature has the kicker 'FullStack' right above the heading 'FullStack'

Low · duplicate-text · effort S

**Problem.** The FullStack feature card on /coding renders the Kicker 'FullStack' (coding.discovery.build) directly above the h2 'FullStack' (coding.evolving.fullstack). The same word appears twice within 44px.

**Change.** Change the kicker to something that adds information, such as 'Build a full app' (one i18n value, translations.ts:29), or remove the Kicker and let the h2 stand alone.

**Evidence.** `client/src/components/coding/CodingSection.tsx:366`, `client/src/i18n/translations.ts:29`, `client/src/i18n/translations.ts:48`

#### coding-18: The pane splitter is a 10px grey bar in a 42px gutter

Low · spacing-alignment · effort S

**Problem.** Between the editor pane (ends at x=734) and the output pane (starts at x=776) sit two 16px grid gaps and a full-height 10px pill (.cd-splitter, background var(--color-border)). That makes a 42px gutter where every other gap is 16px, and the bar is the strongest vertical line on the screen.

**Change.** Make the separator quiet at rest. Set the grid column to 12px with column-gap 2px, giving a 16px gutter. Draw the visible line as a 1px var(--ss-card-line) centre line (background: linear-gradient), which turns var(--brand-accent) at 3px on hover and focus-visible. The 12px column stays the pointer hit area, the existing keyboard handling stays, and the panes gain 26px.

**Evidence.** `client/src/coding/Coding.css:237-247`, `client/src/coding/Coding.css:262-272`

#### coding-19: Run summaries say the same count twice and mix two kinds of error into '5 type errors'

Low · states · effort S

**Problem.** After a TypeScript run, the heading reads '5 type errors'. The count is 1 compiler error plus 4 failed type checks (codeErrors.length + failing). Under it, the 'Type checks' list shows 4 Fail and 1 Pass. The Types badge also says 5 and the Results badge says 0/5, so the learner sees two '5's that mean different things. The string has no singular form, so one error reads '1 type errors'. On JS, the selected tab badge '0/6' sits directly above the heading '0 of 6 passing', the same fact twice.

**Change.** TS: split the summary into '1 compiler error · 4 of 5 type checks fail', with singular and plural strings, and make the Types badge failed/total ('4/5') so it reads like the Results badge. Results: drop the badge from the selected tab, or drop the heading and keep the badge plus the visually hidden live announcement that already exists. Either way, each count appears once.

**Evidence.** `client/src/coding/CodingWorkbench.tsx:932-946`, `client/src/coding/CodingWorkbench.tsx:1038-1039`, `client/src/i18n/translations.ts:1785`


### U4. Learn and FDE: name things once and fit the rows

One Learn header, one lock and Premium signal, Competency evidence collapsed below the modules, and the over-wide Learn, FDE and roadmap containers folded into single rows.

#### learn-01: The Learn header names the section up to five times before any content

High · duplicate-text · effort S

**Problem.** On /learn/forward-deployed-engineer (signed out, 1280) the section name appears five times above the fold: the h1 'Forward Deployed Engineer', the selected segment 'Forward Deployed Engineer · 0%', the section line '...topics the Forward Deployed Engineer path builds on.', the button 'Sign in to add Forward Deployed Engineer to your plan' and the PathShelf title 'Role · Forward Deployed Engineer'. On Web Developer the h1 'Web Developer' sits 100px above the selected segment 'Web Developer · 0%'. The h1 also changes with auth: signed out it is the section name, signed in it is 'Your learning path' (Roadmap.tsx:899), so the same page has two titles. Three grey supporting lines ('Clear the levels in each part...', the device-only note, the section line) sit at three positions in two sizes, and the heading block takes about 130px before the switcher.

**Change.** One header in every auth state: Kicker h1 'Learn' (constant, so the switcher is the only place the section name appears), then the section switcher, then one supporting line: the section line, kept to one line (see learn-08). Drop 'Clear the levels in each part, then pass its test.' from the header (the roadmap key and part tests already explain it). Move the device-only note to a 13px status beside the sign-in action. Shorten the action to 'Sign in to add it to your plan'. Drop the 'Role' kicker on the PathShelf card and title it 'Guided path outline' with the path name only in its link's aria-label. Result: the name appears once, the header shrinks from about 290px to about 170px at 1280.

**Evidence.** `client/src/components/Roadmap.tsx:899`, `client/src/components/Roadmap.tsx:900-907`, `client/src/components/learn/SectionSwitcher.tsx:82-90`, `client/src/components/learn/SectionSwitcher.tsx:169`, `client/src/components/learn/SectionSwitcher.tsx:201`, `client/src/components/paths/PathShelf.tsx:37-43`, `client/src/i18n/translations.learn.ts:25`, `client/src/i18n/translations.learn.ts:33`

#### learn-11: Competency evidence is 2,647px of repeated counts before the modules

High · duplicate-text · effort M

**Problem.** The FDE hub is 23,201px tall. Between the hero and the Modules heading (y=4,827), 'Competency evidence' renders 13 rows of about 191px (2,647px). Each row states its count twice: a 'Not started' chip followed by a bare, unlabelled number ('24'), then 'Activities supplying this evidence (24)'. 'Python comprehension' has 0 activities but still shows 'Not started 0' and an empty expander. On the page 134 'Not started' labels are visible (13 chips + 121 activity rows), plus 103 more inside the collapsed expanders.

**Change.** Move Competency evidence below Modules and collapse it by default as one 56px disclosure: 'Competency evidence · 13 areas'. Inside, one 56px row per competency: title + one-line summary left, one labelled count right ('0 of 24 verified'), and the activity list behind the row's own disclosure. Skip competencies with no activities. The modules then start in the second or third screen instead of the sixth (y=4,827 at a 900px viewport).

**Evidence.** `client/src/components/paths/FdeHub.tsx:56-78`, `client/src/components/paths/LearningPaths.css:658-665`, `client/src/i18n/translations.paths.ts:22`

#### learn-22: A Premium topic prints 'Premium' 29 times and its 'Continue' opens the upgrade sheet

High · duplicate-text · effort S

**Problem.** On a free account, selecting TypeScript shows 'PREMIUM' on the tile and then a 'Premium' label under every one of the 28 level and test nodes, each also dashed and locked. Because the label takes the second line, titles are clamped to one line and truncate ('Union...', 'Indexed...'). Meanwhile the overview card still offers a green 'Continue — Level 1' SwimCta, which opens the upgrade sheet rather than a level, so the primary action misdescribes what it does.

**Change.** Say it once: in the overview card, replace 'Continue — Level 1' with 'TypeScript is part of Premium' and a SwimCta 'See Premium' (it already opens the upgrade sheet). On the map, drop the per-node 'Premium' label (keep the lock icon, the dashed edge and the existing aria-label 'Level 7: Union Types, Premium'), which lets titles use two lines again.

**Evidence.** `client/src/components/Roadmap.tsx:1370-1419`, `client/src/components/Roadmap.tsx:438-441`, `client/src/components/Roadmap.tsx:651-659`, `client/src/components/Roadmap.tsx:1055`

#### learn-06: The 'Continue' card spends 128px and two rows on one line of content and repeats the tile above it

Medium · whitespace-width · effort S

**Problem.** The overview card under the topic rail is 800x128. 'JavaScript — all topics' and '0 / 25 levels' stack on two rows at the left, a 220px progress bar floats in the middle with nothing under it, and the CTA sits right. Both facts repeat the selected tile 250px above ('JavaScript', '0 / 25 levels'), so the card adds nothing except the button. At 390 it becomes three rows and 180px.

**Change.** One 72px row (padding 14px 20px): the fin glyph, then the next step the tile does not show, 'Level 1 of 25 · Values & Math', with the 4px progress bar directly under that text at the text's width, and the 44px SwimCta 'Continue' on the right. Drop the topic name and the count (the selected tile carries them). At 390: two rows, text + bar, then a full-width 44px button.

**Evidence.** `client/src/components/Roadmap.tsx:1034-1058`, `client/src/components/Roadmap.css:68-87`

#### learn-07: The topic rail says 'locked' three ways per tile and leaves its last row half empty

Medium · visual-noise · effort M

**Problem.** Each locked tile carries 'PREMIUM', 'Locked' and a lock icon at once, plus a dashed border and 60% opacity: on Web Developer 6 'PREMIUM' and 7 'Locked' labels in one rail. The 4-column grid puts 10 tiles in 3 rows (199px) and the last row is 50.6% empty. A line under the rail ('7 of 10 paths still locked. Clear the first part of a path... or take the skill check...') explains the locks a fourth time and names the skill check that sits 870px further down. On Software Engineer all 9 tiles are locked: 3 rows, 'Locked' 9 times, before the only action. At 390 the 10 tiles take 366px of the first screen.

**Change.** One lock signal per tile: the lock icon, plus a sentence-case 'Premium' label only where Premium applies; keep 'Locked' in the aria-label (already there: 'Next.js — Locked, Premium'). Use grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)) at 800px so 10 tiles fill 2 full rows of 5 (about 124px instead of 199px). Fold the 'N of M paths still locked' line into the skill-check row so the explanation sits next to the action it mentions. At 390 use 2 columns of 56px tiles.

**Evidence.** `client/src/components/learn/SectionRail.tsx:105-131`, `client/src/components/Roadmap.css:61-67`, `client/src/components/Roadmap.css:258-277`

#### learn-08: The section line wraps in an 800px column and its button takes a third row

Medium · whitespace-width · effort S

**Problem.** The section line is capped at 62ch (537px), so in the 800px column 'AI & LLMs and the service, data and security topics the Forward Deployed Engineer path builds on.' wraps to two lines with a third of the row empty. The sign-in button then sits alone on the next row, half of it empty. The header grid is 94px for one sentence and one button.

**Change.** Make .rm-section-header one row from 768px: the line on the left (1fr, single line), the action on the right (auto), align-items:center, gap 24px. With the shorter copy from learn-01 ('AI & LLMs and the service, data and security topics this path builds on.' and 'Sign in to add it to your plan') both fit at 800px. Below 768px keep the stacked layout.

**Evidence.** `client/src/components/Roadmap.css:565-572`, `client/src/components/learn/SectionSwitcher.tsx:200-203`

#### learn-09: The empty-section card is a narrower, centred island that breaks the left edge

Medium · centering · effort S

**Problem.** 'Nothing here is open yet' is a 620px card centred at x=328, while the header, rail, divider and skill-check row are 800px and left-aligned at x=238. Its only action ('Go to JavaScript') is a 32px secondary button, and the other way in (Skill check, 36px) sits in a separate row under a divider. Same island on Software Engineer.

**Change.** Render the empty state in the 800px column, left-aligned, without a card border: the title (h2), one line ('Pass 5 levels of JavaScript to open AI & LLMs.') and one action row with 'Go to JavaScript' as SwimCta md (44px) and 'Take the skill check' as a secondary lg (44px) beside it. Hide the separate skill-check row in this state so there is one row of next steps.

**Evidence.** `client/src/components/Roadmap.css:603-618`, `client/src/components/learn/SectionRail.tsx:140-160`, `client/src/components/Roadmap.tsx:978-994`

#### learn-10: FDE path hero squeezes its text into 486px and leaves a 277x355px blank to the right

Medium · whitespace-width · effort S

**Problem.** Signed in, .lp-head is a wrapping flex row: the actions ('Continue where you left off', 'Pause') take a right column only 44px tall, and the text column shrinks to about 499px. The lead wraps to 5 lines, the inventory wraps to two rows ('10 written artifacts · 40-60 hours' alone on row 2) and the note to 5 lines, leaving a 277x355px blank area. Signed out the same header is full width (lead 661px, one-row inventory), so the layout differs by state. Signed out there is no sign-in button, only the sentence 'Sign in to record graded work.'

**Change.** Stack the hero in every state: kicker, h1, lead (max 66ch), inventory in one row, then one action row left-aligned under it: SwimCta md 'Continue where you left off' + ghost lg 'Pause' (both 44px); signed out, SwimCta 'Sign in to start' (the shared SignInButton). Move the 'four kinds of activity' note under the Modules heading. This lifts 'What you will be able to do' by about 100px.

**Evidence.** `client/src/components/paths/LearningPaths.css:33-45`, `client/src/components/paths/LearningPathScreens.tsx:299-352`

#### learn-12: Activity rows repeat their kind and state and spend 84-120px each

Medium · duplicate-text · effort S

**Problem.** Each activity row has an uppercase kind label 'READ' in a 5.5rem column, then a title that starts with 'Read:' again, minutes, a 'Not started' chip on every row and a 2-3 line summary. On the module page rows are 99-120px; on the hub about 120 such rows (84px each) make up most of the 23,201px. The kind column leaves a 64px gap between 'READ' and the title.

**Change.** Drop the 'Read:' prefix from read titles in content (the kind says it). Show state only when it is not 'not started' (a check or half-circle glyph beside the minutes; keep the text for screen readers). On the hub show one-line 48px rows (kind · title · minutes) and keep summaries for the module page. Narrow the kind column to 4.5rem.

**Evidence.** `client/src/components/paths/LearningPathScreens.tsx:126-141`, `client/src/components/paths/LearningPaths.css:141-167`

#### learn-13: The FDE module page has no primary action

Medium · hierarchy · effort S

**Problem.** On /learn/forward-deployed-engineer/path/<module> the header's action slot (.lp-head__actions) holds only the grey text 'Not started'. There is no Start or Continue anywhere on the page; the learner must guess that the first green title in the list is where to begin.

**Change.** Put a SwimCta md in .lp-head__actions: 'Start module' when nothing is recorded, else 'Continue: <next activity title>' (truncate at 32 chars), linking to the first unfinished activity. Move the state text to a small badge beside the kicker. Mark the next activity row with the 3px accent left edge used for the current Learn node.

**Evidence.** `client/src/components/paths/LearningPathScreens.tsx:944-968`

#### learn-15: Four different page headers and browser-blue links across the Learn area

Medium · consistency · effort S

**Problem.** Learn sections open with the green 800-weight Kicker h1 and wave; the FDE path and module pages use an uppercase kicker + plain bold h1; /learn/big-o uses a plain h1 with no kicker in a 640px column; /roadmap uses display-3 at weight 400 in a 780px column starting at x=248, 10px in from every other 800px route and from the footer. The roadmap's three section headings ('Web Developer', 'Software Engineer', 'Forward Deployed Engineer') and Big O's 'Back to the Big O guide' are browser-default blue underlined links, outside the palette.

**Change.** One Learn page header: Kicker (h1, 800 weight, wave) + one supporting line, in the shared 800px column (remove CareerRoadmap's maxWidth 780 and Big O's 640 wrapper). Style section headings as text-colour headings with an accent arrow ('Web Developer →'), and give every Learn-area inline link the .lp-page link rule (var(--color-text-accent), 1px underline).

**Evidence.** `client/src/components/CareerRoadmap.tsx:252`, `client/src/components/CareerRoadmap.tsx:257-259`, `client/src/components/CareerRoadmap.tsx:367-369`, `client/src/components/Roadmap.tsx:1901-1908`, `client/src/components/paths/LearningPaths.css:22`

#### learn-16: The career roadmap repeats the track and the same pillar cards in every section

Medium · duplicate-text · effort M

**Problem.** The chosen track 'Fullstack' appears in the segmented control, again as a badge in the progress card and again in '...passed on the Fullstack track'. 'Choose your track' above the control is followed by 'Choose Frontend, Backend or Fullstack, then follow it...' in the next card. Below, the three section groups repeat the same pillar cards with identical text: 'Backend & the web' 3 times, 'How the web works' 3 times, 'Topics' 3 times, 'Engineering for production' twice (22 duplicated strings). Grid pairs force equal heights, so the 'Topics' card holds one 20px row in 190px and Software Engineer's 'Topics' card is 404px for two rows.

**Change.** Drop the badge and the '...on the Fullstack track' clause; the segment is the only track label. Cut 'Choose Frontend, Backend or Fullstack, then' from the roadmap card. Below the map, render each section as one compact list (pillar heading, then one 44px row per topic with its levels count and bar), listing a topic only under the first section that uses it and adding 'Also in: Software Engineer' as a small tag. Use align-items:start on the pillar grid so cards size to their content.

**Evidence.** `client/src/components/CareerRoadmap.tsx:265-305`, `client/src/components/CareerRoadmap.tsx:345-360`, `client/src/components/CareerRoadmap.tsx:363-439`

#### learn-17: Roadmap map: single-topic tiers waste 65% of each row and the stage numbers skip 3

Medium · whitespace-width · effort M

**Problem.** In 'Your roadmap', stages 2, 4, 5, 6 and 7 each hold one 260px topic card centred in a 738px row, with a stage label above and a connector arrow below: about 185px per stage, five stacked stages over about 925px, each row 65% empty. The stage numbers read 1, 2, 4, 5, 6, 7: the badge shows the index in the full track (i + 1), so a hidden stage leaves a gap.

**Change.** Lay out each stage as one row: a 180px label column on the left ('2 Version control') and its cards on the right, so a single-topic stage takes about 120px and the map shrinks by about 330px. Number visible stages consecutively (position in visibleStages + 1). Keep the vertical connector in the label column.

**Evidence.** `client/src/components/RoadmapTree.tsx:77-100`, `client/src/components/RoadmapTree.tsx:170-172`

#### learn-20: Section switcher hides the third section at 390px

Medium · mobile · effort S

**Problem.** At 390 the switcher scrolls inside a 354px box. 'Web Developer · 0%' fits, 'Software Engineer · 0%' reaches the edge, and 'Forward Deployed Engineer · 0%' (x=364-603) is off screen. Nothing shows that the control scrolls, so a phone user sees two of three sections.

**Change.** Below 600px, render the sections as a vertical radio list: three full-width 44px rows (RadioCard, name left, percent right), about 148px. Or keep the segmented control with short labels ('Web', 'Software', 'FDE') and no percent, three equal 116px segments. Either way all three are visible without scrolling.

**Evidence.** `client/src/components/Roadmap.css:557-564`, `client/src/components/learn/SectionSwitcher.tsx:73-92`

#### learn-14: The FDE path says 'not a certification' twice and labels an unfinished path 'completed'

Low · duplicate-text · effort S

**Problem.** The non-goals list says 'A certification...' and 'Evidence of production experience or any claim about employment...'. The 'Where you are' card says it again: 'It is not a certification, not evidence of production experience, and not a claim about employment.' The same card's first line reads 'FDE guided path completed' next to an 'In progress' badge, which reads as a contradiction.

**Change.** Keep the disclaimer once, in the non-goals list, and drop paths.completionNote from the card (or keep only its first sentence, 'Completion describes what you passed in these exercises.'). Relabel the line 'Guided path' followed by the state badge ('In progress' / 'Completed').

**Evidence.** `client/src/components/paths/LearningPathScreens.tsx:405-428`, `client/src/i18n/translations.ts:1929`

#### learn-19: Big O guide and Big O introduction repeat the same paragraph and use three kinds of CTA

Low · duplicate-text · effort S

**Problem.** /big-o ends with 'Two short lessons: Complexity Basics, then Big O and Growth. Both are free...' and a link 'Open the free Big O learning path'. That link opens /learn/big-o, which repeats the same paragraph word for word, then shows two 32px buttons and a third, blue 'Back to the Big O guide' link underneath. /learn/big-o is a 640px column (x=318) while /big-o is 800px (x=238).

**Change.** On /big-o, replace the closing paragraph + link with one row: 'Two free lessons' and a SwimCta md 'Start lesson 1' that opens lesson 1 directly. On /learn/big-o, drop the repeated paragraph (one line: 'Lesson 1 of 2' / 'Lesson 2 of 2' under each button), use the 800px column and Learn header (learn-15), show the two lessons as SwimCta + secondary lg in one row, and move 'Big O guide' to a kicker link above the h1, as the FDE module page does.

**Evidence.** `client/src/components/BigOPage.tsx:47`, `client/src/components/Roadmap.tsx:1901-1908`, `client/src/i18n/translations.ts:2335`

#### learn-21: Lesson text shows raw *asterisks* where emphasis was meant

Low · other · effort S

**Problem.** In the Big O lesson 'Counting work, not seconds', the NOTE callout reads 'Best, average and worst name *which* cost function...', and a later paragraph reads 'an upper *and* a lower bound'. InlineText handles only code and links, so authored emphasis prints as literal asterisks.

**Change.** Support *emphasis* in InlineText as <em> (outside code spans only), or remove the asterisks from lib/learn-lessons content and add a content check that rejects /\*\w+\*/ outside code.

**Evidence.** `client/src/components/learn/LessonBody.tsx:47`, `lib/learn-lessons/dsa/d01.ts:44`

#### learn-23: FDE delivery loop repeats 'completed' six times and wraps every phase to two lines

Low · duplicate-text · effort S

**Problem.** 'The delivery loop' has a label 'Required modules completed' above an empty bar, then five 150px phase columns that each say '0 of N modules completed', which wraps to two lines (38px) in every column; 'Discover and scope' also wraps. The word 'completed' appears six times in one band.

**Change.** Keep 'Required modules completed' once as the bar label and show each phase as 'Integrate' + '0 / 3' (tabular numerals) on one line. Give the phase strip a 4-column/5-column grid with min 140px so titles stay on one line at 800px.

**Evidence.** `client/src/components/paths/LearningPathScreens.tsx:299-352`


### U5. Public pages and money screens: say each fact once and give every task a primary action

Sign-in copy and the /premium facts said once, checkout gets its primary button, /shop loses its dead space, one signed-out pattern, and the phone fixes for the drawer and the comparison table.

#### money-02: Crown and streak protection are two over-wide cards that render at different heights (104px vs 208px at 390)

High · consistency · effort M

**Problem.** The two coin items are the same kind of thing but are built differently. The crown uses a 44px <Crown> icon; streak protection uses a 24px ShieldIcon in an inline-styled span. Both sit in an HStack wrap="wrap" with no fixed column for the price and Buy button. At 1280 each item is a 1080x104 card with the name on the left and price + Buy ~750px away on the right. At 390 the crown card stays on one row (104px), but the streak protection card wraps into icon / title / blurb / price+Buy and grows to 208px, so siblings in one list differ by 2x. The section also uses two separate Astryx Cards, while the rest of the page uses ruled rows (How to earn, invite counts).

**Change.** Render both items as rows of one ruled list that reuses the .rw-earn__row rhythm. Use `display:grid; grid-template-columns: 44px 1fr auto; gap: 12px 16px; align-items:center; min-height:72px`. Column 1 holds the icon, both 44px (ShieldIcon size={44}, colour moved into a class). Column 2 holds the h3 with the blurb below it. Column 3 holds the price and Buy. Below 600px, use `grid-template-areas: 'icon name' 'icon blurb' '. action'` with the action right-aligned, so both rows always have the same structure and height. Drop the two Cards: the list sits on the page canvas like How to earn.

**Evidence.** `client/src/components/Shop.tsx:604-667`, `client/src/components/Shop.tsx:646-648`, `client/src/components/Rewards.css:91`, `client/src/components/Rewards.css:200`

#### money-03: /premium says the same thing three to five times (VAT 5x, what Premium opens 3x, a second section kicker)

High · duplicate-text · effort S

**Problem.** VAT is stated five times on one page: 'before VAT' on each plan card, 'Both prices exclude VAT…' in Before you pay, 'Prices exclude VAT. Applicable VAT is added at checkout.' under the comparison heading, and '€4.99 a month, before VAT' in the table's column header. What Premium opens is stated three times: by the lead, by the 'Premium includes' list (PremiumPage.tsx:165) and by the comparison table (PremiumPage.tsx:167). The table also brings its own 'PLANS' kicker, 1,100px below the 'Choose a plan' section. The cancel and refund FAQ answers both end with the same link label 'Open the cancellation page' (legal.link.cancel), though one goes to ?action=withdraw. The list and the table are not equivalent: the list mentions project stages and the FDE path, which the table does not.

**Change.** State each fact once, where the decision is made. (1) Add the two missing rows to the comparison table: 'Projects and short paths' (Free: opening stages / Premium: every stage) and 'Forward Deployed Engineer path' (Free: diagnostic and first module / Premium: every module as it ships). Then remove <PremiumIncludes> from /premium (PremiumPage.tsx:165); the upgrade sheet keeps the list. (2) Add an `embedded` prop to ComparisonTable that hides the Kicker and the subtitle (ComparisonTable.tsx:111 and 118-120), and pass it on /premium. (3) Keep 'before VAT' on the plan cards, where the price is, and the VAT bullet in Before you pay; on /premium change the Premium column caption to '€4.99 a month'. (4) Give the refund FAQ link its own key, 'Withdraw and get a refund'. This saves ~300px of scroll at 1280 and keeps the legal VAT and renewal statements next to the price.

**Evidence.** `client/src/components/PremiumPage.tsx:165-167`, `client/src/components/landing/ComparisonTable.tsx:111-120`, `client/src/components/PremiumFacts.tsx:35-62`, `client/src/components/PremiumPage.tsx:58-63`

#### money-04: Checkout: the last step before payment has no primary button and a loose, grey price

High · button-size · effort M

**Problem.** 'Continue to secure payment' (PremiumBillingPages.tsx:178) has no variant, so it renders as the default secondary. It is stretched to 750x32 at 1280, has the same grey fill as 'Back to plans' below it, and leaves the screen with two secondaries and no primary. The summary card is 800x444 for five short items: Monthly at y=309, the price at y=366, the renewal line at y=432 and the links at y=498. The 40-66px gaps come from the .ss-info-card p margins (app-shell.css:380) added to the card's 0.9rem flex gap. The price is 1.35rem (22px) and inherits the secondary text colour from .ss-info-card p, while /premium shows the same price at 36px in ink. The checkbox's 'Required' marker floats 340px right of its label (x=963). Signed out, the lead says 'Review your plan…' but no plan is shown, only a full-width grey 'Sign in to continue' and 'Back to plans'.

**Change.** (1) Render the summary with the /premium plan-card markup (.ss-premium-plan: h3 name, ink price at 36px + 'a month', one renewal line), so the price looks the same at every step, and show it signed out too. (2) Put the actions in one footer row: 'Back to plans' as variant="ghost" on the left and 'Continue to secure payment' as variant="primary" (auto width) on the right. Below 600px, stack the primary full width above the ghost button. Signed out, the right button is a primary 'Sign in to continue'. (3) Zero the paragraph margins inside .ss-checkout-card and let the 0.9rem gap set the rhythm. (4) Drop isRequired on the only consent box: the disabled Continue already gates it, and aria-describedby can point at the consent sentence. The card shrinks from 444px to ~300px.

**Evidence.** `client/src/components/PremiumBillingPages.tsx:165-187`, `client/src/components/PremiumBillingPages.tsx:170`, `client/src/components/PremiumBillingPages.tsx:177-178`, `client/src/components/PremiumBillingPages.tsx:186`, `client/src/components/PremiumBillingPages.css:25`, `client/src/styles/app-shell.css:380`

#### money-05: Signed-out states on the money screens use four different patterns

Medium · states · effort M

**Problem.** A signed-out visitor sees four patterns. The /shop wallet is a 1080x158 card with a green '—' placeholder, the unit 'coins' and the text-only line 'Sign in to see your coins.' with no button; content fills 22% of the card and 841px is empty. The invite section has the text-only line 'Sign in to get your invite link.' with no button. Both Buy buttons are silently disabled. /premium/checkout has a full-width neutral 'Sign in to continue', while /premium's voucher card has a primary 'Sign in to redeem' with an explanatory note. The contract asks for 'one cause, one next action, stable layout'. (The /collection and /play gates are covered by social-account-17.)

**Change.** Use one inline signed-out block on every money screen: one sentence in secondary text followed by a primary 'Sign in' button at the page's standard button size (aria-haspopup="dialog", openSignIn({ returnTo })). It replaces content in place and is not a new card. On /shop, replace the '—' and 'coins' in the wallet with that block, so no fake zero is shown. Add the same button under the invite sentence. Make Buy read 'Sign in to buy' and open sign-in instead of being disabled. Checkout uses the same block under the plan summary (money-04). Keep 'Sign in' as the verb: it is used in 30 strings against one 'Log in'.

**Evidence.** `client/src/components/Shop.tsx:155-163`, `client/src/components/ReferralInvite.tsx:88`, `client/src/components/Shop.tsx:628`, `client/src/components/Shop.tsx:661`, `client/src/components/PremiumBillingPages.tsx:170`, `client/src/components/PremiumVoucher.tsx:217-223`

#### money-07: Buy is disabled without saying why (balance 640, crown costs 1,200)

Medium · states · effort S

**Problem.** With 640 coins the crown's Buy is a pale, disabled pill with no explanation, and the learner has to do the arithmetic. The page already has the copy for this case: merchandise shows 'Not enough coins' (shop.insufficient) under a short balance at Shop.tsx:416. The crown and streak-protection rows do not use it.

**Change.** When balance < price, show '560 more coins' (a new key, shop.shortBy, with the number) in secondary text under the price, and link it to the Buy button with aria-describedby, so the reason is both visible and announced. Do the same in both coin rows by reusing the merchandise pattern at Shop.tsx:416. Signed out, see money-05.

**Evidence.** `client/src/components/Shop.tsx:625-630`, `client/src/components/Shop.tsx:658-663`, `client/src/components/Shop.tsx:416`

#### money-08: Three h2 sizes on /premium, and /shop's page title skips the editorial header

Medium · hierarchy · effort S

**Problem.** On /premium the h2s come in three sizes. 'Choose a plan', 'Premium includes' and 'Questions' are 21.6px/800 (.ss-premium-section-title). 'Have a voucher?' is 16.8px/700, shrunk by the generic .ss-info-card h2 rule. 'What you get, free and with Premium' is 28px/800 from an inline style in ComparisonTable. Across siblings, /premium, checkout and cancel use the editorial header (fin, kicker, 47px/800 h1), but /shop's h1 'Coins' is a 29px weight-400 Astryx display-3 with no fin or kicker. Checkout also drops the 'devShark Premium' kicker that success and cancel carry.

**Change.** (1) On /premium, give every h2 the .ss-premium-section-title class (21.6px/800). With the money-03 `embedded` prop, the ComparisonTable h2 uses that class instead of its inline 1.75rem, and the voucher h2 gets the class too, with the .ss-info-card h2 override scoped so it no longer applies. (2) Render /shop's title through the same Page header as /premium (PublicInfoPages Page: fin, h1 at --ss-type-title/800), with the kicker 'Rewards'. (3) Pass the 'devShark Premium' kicker to the checkout Page.

**Evidence.** `client/src/components/landing/ComparisonTable.tsx:112-117`, `client/src/styles/app-shell.css:368-379`, `client/src/components/PremiumPage.css:6-10`, `client/src/components/Shop.tsx:585-589`, `client/src/components/PremiumBillingPages.tsx:165`

#### money-11: Upgrade sheet: the framing sentence is smaller than the list, a 74px empty band, and a hand-written kicker

Medium · hierarchy · effort S

**Problem.** The sheet's subtitle 'Your free plan keeps HTML, CSS, JavaScript and React levels 1 to 12.' is 13px secondary text squeezed to 369px by the header row, and it leaves '12.' alone on the second line. The bullet list under it is 16px primary, so the supporting list is louder than the framing sentence. The title starts 74px below the dialog's top edge (dialog y=167, title y=241) with nothing in between. 'Premium includes' is written as <p className="ss-kicker"> by hand (UpgradeSheet.tsx:51), which DESIGN_RULES 4a forbids because it always gets wave variant 1.

**Change.** (1) Replace the hand-written p with <Kicker as="p"> from LandingKit. (2) Move the 'free plan keeps…' sentence out of DialogHeader's subtitle into the body as Text type="body" (15-16px), so it spans the full 414px and the order reads title, what you keep, what Premium adds, price, CTA. (3) Reduce the header's top padding to the 24px body rhythm, saving ~50px. Keep the Close button's 44px coarse-pointer floor as it is.

**Evidence.** `client/src/components/UpgradeSheet.tsx:43-55`, `client/src/styles/app-shell.css:778`, `DESIGN_RULES.md:102-105`

#### money-15: Signed-out /premium: two identical 'Sign in to continue' buttons and 'Sign in first' twice

Medium · duplicate-text · effort S

**Problem.** Signed out, both plan cards' CTAs become 'Sign in to continue' (PremiumCheckoutButton.tsx:60), so the plan name disappears from the buttons; the metrics flag the label as a duplicate. The page then adds 'Sign in first. You come back here to choose a plan.' under the cards and 'Sign in first. The voucher opens Premium on the account you sign in with.' plus 'Sign in to redeem' in the voucher card. That is four sign-in prompts in 500px, while the header button says 'Log in', a different verb.

**Change.** Keep the plan-specific labels for everyone: 'Continue with monthly' / 'Continue with yearly'. Signed out, the press opens sign-in with returnTo /premium/checkout?plan=…, which it already does, and the button gets aria-haspopup="dialog". Delete the premium.page.signedOut note (PremiumPage.tsx:159). In the voucher card keep only the 'Sign in to redeem' button and drop the 'Sign in first…' line. Make the header's 'Log in' (auth.logIn) read 'Sign in', the verb used in 30 other strings.

**Evidence.** `client/src/components/PremiumCheckoutButton.tsx:58-78`, `client/src/components/PremiumPage.tsx:159`, `client/src/components/PremiumVoucher.tsx:217-223`, `client/src/i18n/translations.ts:336`, `client/src/i18n/translations.ts:1388`, `client/src/i18n/translations.ts:1448`, `client/src/i18n/translations.ts:1477-1478`

#### money-16: At 390, the comparison table squeezes three columns into 354px, and cells wrap to 5 lines

Medium · mobile · effort M

**Problem.** On /premium at 390 the comparison table keeps its three columns. The Free and Premium columns shrink to ~77px of text, so 'A starter set, plus the opening stages of every project' wraps to five lines and 'Every challenge, plus each new one' to four, hyphenated. The table is 354x528 and is the hardest part of the page to read on a phone, where most visitors compare plans.

**Change.** Below 600px, render each table row as a small definition block: the feature name (th) on its own line, then two equal columns, 'Free' and 'Premium', each value with its mark. Use `display:grid; grid-template-columns:1fr 1fr` on the row, and keep the visible column headers once at the top as a sticky caption. Keep the table semantics with role="table" and the existing th scope. Alternatively, drop the feature-name column at <600px and put the feature name as a full-width row header above its two values. Shared with the landing page (landingSections.css:28).

**Evidence.** `client/src/components/landing/ComparisonTable.tsx:122-160`, `client/src/components/landing/landingSections.css:18-60`

#### money-12: The /shop wallet says 'Coins', 'Your coins' and 'coins' within 180px

Low · duplicate-text · effort S

**Problem.** The h1 'Coins' is followed by the wallet label 'YOUR COINS' and then by the unit 'coins' after the number; the metrics flag 'coins' as a duplicate. The subtitle 'Learning earns coins. Spend them on the crown or a streak protection.' repeats the two section kickers directly below it (How to earn; Crown and streak protection).

**Change.** Keep the h1 and the number with its unit. Make the wallet label 'Your coins' a visually hidden h2 (.ss-sr-only), so the section keeps its accessible name. Drop the subtitle, or cut it to one clause that adds something new ('Coins never buy XP or a place on a board.').

**Evidence.** `client/src/components/Shop.tsx:155-158`, `client/src/components/Shop.tsx:586-589`, `client/src/i18n/translations.ts:233-237`

#### money-13: At 390, the How-to-earn figures drop onto their own bold lines

Low · mobile · effort S

**Problem.** Below 600px, .rw-earn__row switches to flex-direction:column, so each figure ('Today: 18 of 400', '+200', '9 of 30 days') becomes a bold 17px line under the detail text. Each row goes from two lines to four, the list runs 590px, and the bold figure reads like the heading of the next row. The figure column is also ragged: 'Top three of the month' never has a figure.

**Change.** Below 600px, use `grid-template-columns: 1fr auto; grid-template-areas: 'label figure' 'detail detail'`. The label and figure share the first line, with the figure right-aligned and tabular-nums, and the detail spans full width below. Rows without a figure leave the cell empty. This removes ~25% of the list height.

**Evidence.** `client/src/components/Shop.tsx:283-298`, `client/src/components/Rewards.css:197-199`

#### money-14: The dashed 'Premium milestones' box adds a container and a second CTA style

Low · visual-noise · effort S

**Problem.** Under How to earn, a dashed-border box (1080x61 at 1280, 354x153 at 390) holds one sentence and a grey 'See what Premium includes' pill. It is the only dashed surface on the page and sits between two ruled lists. At 390 it takes 153px.

**Change.** Remove the .rw-premium-note box. Render the sentence as .rw-muted text under the list, with 'See what Premium includes' as a ghost button (or an inline text link that opens the sheet) at its end. That is one container fewer, and the section's ruled-row rhythm stays intact.

**Evidence.** `client/src/components/Rewards.css:79-88`, `client/src/components/Shop.tsx:300-309`

#### shell-public-04: 'Log in' vs 'Sign in', and three sign-in prompts on /auth/confirmed

Medium · duplicate-text · effort S

**Problem.** The header button says 'Log in' (auth.logIn). The hero link says 'Sign in or create an account', the dialog title 'Sign in to devShark' and the auth pages 'Sign in', and all of them open the same dialog. On /auth/confirmed the lead ends 'Already did? Sign in.' as plain text, a separate secondary 'Sign in' button follows, and the header 'Log in' is on screen too: three sign-in prompts with two different verbs in one viewport. At 390 the long hero link (215px) no longer fits beside 'Choose a topic' and wraps: a 354×96 block for two controls.

**Change.** One verb everywhere: auth.logIn becomes 'Sign in'. Shorten home.signIn to 'Sign in' (≈55px), so 'Choose a topic' + link fit in one 44px row at 390 (157 + 20 + 55 = 232 < 354). On /auth/confirmed, cut 'Already did? Sign in.' from authPage.confirmVisitLead and keep the single 'Sign in' button. Move it into the card as a text link under the resend form ('Already confirmed? Sign in'), so the card is the only block under the header.

**Evidence.** `client/src/components/SignInButton.tsx:37`, `client/src/i18n/translations.ts:336`, `client/src/i18n/translations.ts:2185`, `client/src/i18n/translations.ts:2263`, `client/src/components/auth/AuthPages.tsx:213-226`, `client/src/components/Home.tsx:223-234`

#### shell-public-05: Sign-in dialog says 'Sign in' three times, 'Forgot password?' outweighs the submit, and the dialog jumps on tab switch

Medium · duplicate-text · effort S

**Problem.** In the Sign in view, the title 'Sign in to devShark', the selected tab 'Sign in' and the submit 'Sign in' repeat each other. Create account repeats the pattern ('Create your devShark account' / 'Create account' / 'Create account'). 'Forgot password?' is a 16px bold accent underlined link in a 44px row, louder than the 14px submit label under it. On desktop the dialog is 440×612 in Sign in and 440×583 in Create account. It is vertically centred, so its top moves 144→158 and the Google button and tabs shift 14px under the pointer. At 390 the height stays the same, because the coarse-pointer 44px rules apply.

**Change.** Use one fixed title, 'Your devShark account', with the existing subtitle, and let the segmented control carry the mode. Keep the two submit labels. Render 'Forgot password?' at the .ss-auth__note size (13px, 600, secondary colour) right-aligned. Reserve the same 44px row under the password in both modes ('Forgot password?' in Sign in, the 8-character hint in Create account), so both views are 612px and nothing moves. Apply the 44px action size from shell-public-02 to Google, the tabs and the submit.

**Evidence.** `client/src/components/auth/SignInDialog.tsx:38-42`, `client/src/components/auth/SignInDialog.tsx:300-336`, `client/src/components/auth/Auth.css:20-21`, `client/src/i18n/translations.ts:2187-2200`

#### shell-public-06: /premium repeats its own facts: includes list vs table, VAT ×4, sign-in ×3

Medium · duplicate-text · effort M

**Problem.** The 'Premium includes' list (All 17 Learn topics, React from level 13, every coding challenge, every project stage, FDE) sits directly above the 'What you get, free and with Premium' table, which states the same facts row by row. The table again carries the kicker 'PLANS' on a page whose first section is 'Choose a plan'. VAT appears four times: 'before VAT' on both plan cards, the first 'Before you pay' bullet, the table subtitle 'Prices exclude VAT…' and the table header '€4.99 a month, before VAT'. Signed out, both plan cards show the same 'Sign in to continue' button, then the note 'Sign in first. You come back here to choose a plan.', and the voucher card adds 'Sign in first…' with a third button, 'Sign in to redeem'.

**Change.** Drop <PremiumIncludes> from /premium and add the FDE line as a sixth table row ('FDE path': 'Diagnostic and first module' / 'Every module'), so the table is the single comparison on both home and /premium. On /premium, hide the table's kicker and subtitle (a showHeader prop), which takes VAT down to the plan cards and 'Before you pay', as the contract asks. Signed out, label the plan buttons 'Choose monthly' / 'Choose yearly' (44px). Pressing one opens sign-in and returns to checkout, so the card layout is the same in both states. The premium.page.signedOut note and the voucher card's 'Sign in first' sentence can go.

**Evidence.** `client/src/components/PremiumPage.tsx:145-165`, `client/src/components/PremiumFacts.tsx:53-60`, `client/src/components/landing/ComparisonTable.tsx:110-120`, `client/src/i18n/translations.ts:1178`

#### shell-public-07: Phone comparison table squeezes cells to 77px, up to 7 lines each

Medium · mobile · effort S

**Problem.** At 390 the plan table keeps three columns with table-layout: fixed and a 36% feature column. The Free and Premium cells get about 77px of text width, so 'A starter set, plus the opening stages of every project' runs to 7 lines (108px) and 'Every challenge, plus each new one' is hyphenated over 4 lines. The panel is 354×528px for five rows, and short labels such as 'Learn topics' (83px) leave the 127px feature column partly empty. The same table appears on /premium.

**Change.** Keep three columns, which the comment at landingSections.css:108 requires. Under 600px, set the feature column to 28% (thead th:first-child { width: 28% }), cell padding to 10px 6px and the mark gap to 4px. Add phone-length copy for the two long cells, as separate keys used under 600px or as the only copy: 'Starter set + first project stages' and 'All, plus each new one'. Target: no cell over 3 lines and a panel ≤ 400px tall.

**Evidence.** `client/src/components/landing/landingSections.css:108-122`, `client/src/components/landing/ComparisonTable.tsx:130-153`

#### shell-public-08: Home FDE section: four stacked paragraphs in a 685px measure inside a 1000px section, with a bigger h2

Medium · whitespace-width · effort M

**Problem.** 'The FDE path' section is 1000×387px at 1280, but its copy stops at 68ch (x 138–823), so the right ≈315px of every row is empty. It reads as four stacked paragraphs: description, inventory line, access ('…Completion records your work in these exercises.') and a state line ('You can preview the outline. Recording work is unavailable right now.'), then the CTA. The kicker 'The FDE path', the h2 'Forward Deployed Engineer' and the CTA 'Explore the FDE path' say the same thing three times. Its h2 is 36px, against 28px for 'Pick a topic.' and the plans title, and 24px for 'Inside JavaScript'. At 390 the block is 523px tall.

**Change.** Two columns at ≥1024px (grid 1fr / 320px, gap 48px). Left: the kicker, the h2 at the shared section-title size (1.75rem desktop, 1.5rem phone), the description and the CTA. Right: the inventory as four <StatItem>s in a 2×2 grid (15 modules · 28 lessons · 120 questions · 15 exercises), the same component as the hero stats. Merge home.fde.access and home.fde.preview into one line ('First module free. Premium opens the rest; work is not recorded yet.'). Change the kicker to 'New path' so it adds information. Expected size ≈1000×240 at 1280, with no new card.

**Evidence.** `client/src/components/landing/FdePathFeature.tsx:39-51`, `client/src/components/landing/landingSections.css:135-138`, `client/src/i18n/translations.ts:107-115`, `client/src/components/landing/LandingKit.tsx:76`

#### shell-public-09: Phone topic picker is 820px of full-width, one-word cards

Medium · mobile · effort S

**Problem.** Each landing topic card has min-height 5rem (80px) and 1.25rem padding for an icon and one word ('CSS', 'React'). The inline grid uses repeat(auto-fill, minmax(210px, 1fr)), so below ~450px it falls to one column. At 390 the 7 cards plus 'And 10 more' stack into a 354×820px block (y 1130–1950), about one phone screen of buttons before the 'Inside JavaScript' preview they control.

**Change.** Move the grid to a class (.ss-topic-grid) so it can carry a media query. Keep minmax(210px, 1fr) at ≥600px (4 across at 1280). Under 600px use grid-template-columns: repeat(2, minmax(0, 1fr)) with gap 10px, card min-height 56px (still above 44) and padding 12px. Show the selected tick as the existing accent border and tint, so 'TypeScript' fits in a 172px tile. 8 tiles become 4 rows: ≈254px instead of 820px.

**Evidence.** `client/src/components/Home.tsx:259`, `client/src/components/Home.tsx:63-74`, `client/src/styles/app-shell.css:935-940`

#### shell-public-11: Cookie banner and cookie dialog put Accept and Reject in opposite order

Medium · consistency · effort S

**Problem.** The first-visit banner reads 'Accept all · Reject all · Choose'. The Cookie settings dialog, which opens on top of that banner from 'Choose', reads 'Reject all · Accept all · Save choices'. The same two equal-weight buttons swap places between two consecutive surfaces, so a visitor who learned the first position can click the opposite of what they meant. For a consent choice that matters.

**Change.** One order in both: 'Reject all · Accept all · Choose' in the banner (CookieConsent.tsx:115-117) and 'Reject all · Accept all · Save choices' in the dialog. Keep Reject and Accept as equal secondary buttons at 44px.

**Evidence.** `client/src/components/CookieConsent.tsx:115-117`, `client/src/components/CookieConsentDialog.tsx:108-112`

#### shell-public-12: Topic guide pages: browser-blue links, a square 50px CTA and a breadcrumb that repeats the kicker

Medium · consistency · effort S

**Problem.** On /topics/:slug the breadcrumb 'devShark · Home', 'Read the documentation' and the 'More guides' list render as browser-default blue underlined links instead of the accent link style used everywhere else. The practice questions use native ▶ disclosure markers. The only CTA, 'Practice in a quiz', is a 175×50 rounded rectangle (radius-element, 17.7px text). The contract reserves the pill for buttons, and every other CTA is a 44px pill. 'devShark · Home' sits right above the kicker 'devShark · Quick guide', and the header logo already links home. These are SEO entry pages, so this is often a visitor's first screen.

**Change.** Replace the breadcrumb with '← All guides' to /learn, or drop it. Give article links the accent link style (color: var(--brand-accent), 1px underline, offset 3px, as .ss-text-links). Restyle .ss-topic-cta as the pill fin button: min-height 44px, padding 0 20px, 16px/600, border-radius 999px. Give .topic-practice summary a custom '+' marker like the /premium FAQ. CSS and copy only, so the build-time HTML keeps working.

**Evidence.** `client/src/components/topics/TopicArticle.tsx:29-38`, `client/src/styles/app-shell.css:721-732`, `client/src/styles/app-shell.css:374-376`

#### shell-public-14: Auth task cards say their action three times

Low · duplicate-text · effort S

**Problem.** /reset-password: the lead says 'We'll send you a link to set a new password', the card h2 says 'Send a reset link' and the button says 'Send reset link'. /auth/confirmed: card h2 'Send a new confirmation link', button 'Send a new link'. The h2 only repeats the button and adds a 20px line and a heading level to a one-field form.

**Change.** Drop the card h2 and label the section with the page h1 (aria-labelledby). Keep the button as the single statement of the action. On /auth/confirmed, put one short line above the field instead: 'Didn't get it? We'll send a new link.'

**Evidence.** `client/src/components/auth/AuthPages.tsx:112-118`, `client/src/i18n/translations.ts:2267-2268`, `client/src/i18n/translations.ts:2283`, `client/src/i18n/translations.ts:2204`

#### shell-public-15: Mobile drawer: 11 ungrouped links, empty lower third, toggles missing

Low · hierarchy · effort S

**Problem.** The drawer lists Today, Learn, Quiz, Coding, Challenge, Play, Career, Shark Cards, Leaderboard, Premium and Coins as 11 equal 44px rows (y 73–577) with no grouping, so purchase and coins sit among learning destinations. Desktop splits the same items into text links and icon buttons. The App.tsx comment says the theme and sound toggles live in the drawer on mobile, but they are not there: they are in the page footer, hidden behind the open drawer and several screens down a long page. The bottom 267px of the drawer is empty.

**Change.** Two groups separated by a hairline and a small label: 'Practice' (Today, Learn, Quiz, Coding, Challenge, Play) and 'You' (Career, Shark Cards, Leaderboard, Coins, Premium), matching the desktop split. Pin the dark-mode and sound toggles to the bottom of the drawer as two 44px rows, and hide .ss-footer-settings under 760px (see shell-public-03).

**Evidence.** `client/src/App.tsx:195-215`, `client/src/App.tsx:429-435`, `client/src/App.tsx:588-590`, `client/src/App.tsx:691-700`

#### shell-public-16: Home section titles use three sizes, and 'What you get' appears twice

Low · hierarchy · effort S

**Problem.** Home h2s are 28px ('Pick a topic.', 'What you get, free and with Premium'), 24px ('Inside JavaScript') and 36px ('Forward Deployed Engineer'), each set inline or in a different stylesheet, so the page has no single section-title size. The plans h2 'What you get, free and with Premium' is followed at once by a table whose first column header is again 'What you get'. At 390 the plans header (kicker + 3-line h2 + VAT line) takes 122px.

**Change.** Add one .ss-section-title (800 weight, 1.75rem desktop / 1.5rem under 600px, -0.015em tracking) and use it for every home h2, including the roadmap panel's and FdePathFeature's. Rename landing.compare.colFeature to 'Feature' and shorten the h2 to 'Free and Premium', which fits on one line at 390.

**Evidence.** `client/src/components/Home.tsx:255`, `client/src/components/Home.tsx:123`, `client/src/components/landing/ComparisonTable.tsx:112-117`, `client/src/components/landing/landingSections.css:136`, `client/src/i18n/translations.ts:1179`

#### shell-public-17: Signed-in home still asks the learner to 'Start free'

Low · states · effort S

**Problem.** ComparisonTable shows its 'Start free' CTA to everyone not on Premium, signed-in free learners included. The signed-in home shows the full marketing page and ends on 'Start free', while its hero link already reads 'Go to learning path'. The label is wrong for someone who already has an account.

**Change.** On Home pass showCta={!isAuthenticated}, or for a signed-in free learner render a secondary 'See Premium' linking to /premium. Keep 'Start free' for signed-out visitors only.

**Evidence.** `client/src/components/landing/ComparisonTable.tsx:165-177`, `client/src/components/Home.tsx:317`, `client/src/i18n/translations.ts:1189`

#### shell-public-18: Privacy policy: 26 sections over 9,181px with no on-page index; storage table's category column wraps to 3 lines

Low · hierarchy · effort S

**Problem.** /privacy is 9,181px tall at 1280 and 14,007px at 390, with 26 h2 sections and no index or jump links. /terms is 4,588px with 14 sections. In the storage table the Category column is only ≈64px of text width inside a 920px table, so 'Analytics, with your consent' wraps to three lines on four rows (60px each) while the wide columns have room to spare.

**Change.** Add an 'On this page' list of anchor links under the lead (a <details> closed under 600px, open at ≥1024px), in body type with no new panel. Each section already has an id. In the table, give the category column min-width 14ch (white-space: normal) so the label wraps to at most two lines. Leave the legal wording as it is.

**Evidence.** `client/src/components/LegalPages.tsx:115-123`, `client/src/components/LegalPages.tsx:188-193`, `client/src/components/LegalPages.css`


### U6. Social and account: balanced Profile, one name card and one page header

Profile in two balanced columns with one name card, one operational page header across the social pages, one sign-in gate, and the /play and lobby clean-up.

#### social-account-03: Profile's two columns end 927px apart, leaving a dead left half

High · whitespace-width · effort S

**Problem.** At 1280 the Overview grid puts 2 cards on the left (Career 357px, Track 310px) and 5 on the right (Advisor 204, GitHub 245, Sharkname 548, Leaderboard 293, Account 279). The left column ends at y=1383 and the right one at y=2310, so 927px of the left half (36% of the 2600px page) is empty canvas. The code comment says the columns 'end at about the same height'; they do not.

**Change.** Rebalance without adding cards. Left column: Career, Track and sections, Study advisor, GitHub garden (about 1130px). Right column: the merged name card from finding 04 (about 420px), then Account (about 170px after finding 07). Both columns then end within about 100px of each other, and the page is about 900px shorter at 1280. Nothing changes at 390, where the cards stack.

**Evidence.** `client/src/components/Profile.tsx:349-406`, `client/src/components/Profile.tsx:393-394`

#### social-account-04: Name settings are split over two cards, and the name is printed 5 times

High · duplicate-text · effort M

**Problem.** Two stacked cards (548px + 293px) control how the learner's name appears. In 'Your sharkname' the handle shows four times: the large plate (681,1316), the input value, the radio description (699,1521) and the 'Friends see you as' preview (844,1668). The 'Leaderboard' card shows it a fifth time (699,1878) under a different term, 'Shark nickname', although the product architecture says the leaderboard nickname is the sharkname. 'Your sharkname' is both the card kicker and a radio label. Each card has its own name radio pair and its own photo switch, and the hints point at each other ('Choose your leaderboard name separately' / 'This does not change what friends see').

**Change.** Merge into one .ss-panel with <Kicker as='h2'>Your name</Kicker>. Row 1: the sharkname input, Generate and Save in one row at 44px; the input shows the name, so drop the plate. Below it a two-column grid (stacked under 600px) headed 'Friends see' and 'Leaderboards show'. Each column has the same two-option RadioList (Sharkname / Account name) and one photo Switch. Keep one live preview, and drop the radio descriptions that repeat the handle. Rename 'Shark nickname' to 'Sharkname'. The two settings stay independent, which the product rule requires.

**Evidence.** `client/src/components/SharknameCard.tsx:84-86`, `client/src/components/SharknameCard.tsx:324-343`, `client/src/components/LeaderboardVisibilitySwitch.tsx:19-36`, `client/src/components/Profile.tsx:769-779`, `client/src/i18n/translations.ts:491`, `docs/product-architecture.md:229-236`

#### social-account-07: Account card spreads each action over 3 rows and repeats its label

Medium · whitespace-width · effort S

**Problem.** The Account card (279px) stacks a title, a description and a right-aligned button on its own row for each of two actions. 'Sign out on all devices' is the row title (667,2111) and then the button label (953,2180), so the same words appear twice 70px apart. The buttons sit alone at the right of otherwise empty rows. The card also overrides .ss-panel with a muted background, so it differs from its siblings.

**Change.** Settings-row pattern: one row per action, the title and a one-line description on the left and the 44px button on the right; stack under 600px. Retitle the first row 'All devices' so it does not repeat the button. Drop the muted background so the card uses plain .ss-panel. The destructive action keeps BrandedConfirmDialog. The card drops from 279px to about 170px.

**Evidence.** `client/src/components/Profile.tsx:836-860`, `client/src/i18n/translations.ts:604-610`

#### social-account-08: Profile header repeats the footer's dark-mode and sound controls

Medium · duplicate-text · effort S

**Problem.** The identity banner has two 44px icon buttons for dark mode and sound (1025,151 and 1077,151). The global footer on the same page has 'Switch to dark mode' and 'Turn sound on' (994,2420), and the project rules make the footer the home of those controls. Next to the learner's name, the icons read as profile actions. They also push the plan line to two rows: 'See what Premium includes' sits alone on its row (78.7% empty), and the banner is 203px tall.

**Change.** Remove IdentitySettings from the banner; the footer has these controls on every route. Make the plan line one row: 'PLAN Free · HTML, CSS, JavaScript… starter set' on the left (one line, ellipsis) and 'See what Premium includes' as a 44px ghost button on the right. The banner shrinks to about 140px.

**Evidence.** `client/src/components/Profile.tsx:65-95`, `client/src/components/Profile.tsx:270-272`, `client/src/components/DeepEndScreens.css:14`

#### social-account-10: 'Shark Cards' appears 4 times on one screen, and the kicker restates the lead

Medium · duplicate-text · effort S

**Problem.** Signed out, /collection shows 'Shark Cards' as the h1 (38,145), the selected tab (50,273), the sign-in heading 'Sign in to keep Shark Cards' (516,421) and the first words of its body 'Shark Cards are saved…' (385,464). The kicker 'SAVED QUESTIONS' and the lead 'Questions you missed and saved…' say the same thing a fifth way. On the coding tab, the tab 'Coding challenges', the h1 'Saved coding challenges' and the lead 'Coding challenges you saved from their pages' repeat each other.

**Change.** Owner decision 12 names the page after the open tab, so keep that h1. Remove the per-tab kicker (the tabs already say which shelf is open) and keep one lead line under 70 characters ('Questions you missed and saved. Turn a card for the answer.'). Sign-in panel: title 'Sign in to save questions', body 'Your cards stay with your account on every device.' Coding tab lead: 'From the task pages, with your last code.' Result: one name per screen plus the tab.

**Evidence.** `client/src/components/Collection.tsx:77-84`, `client/src/components/Flashcards.tsx:156-162`, `client/src/i18n/translations.ts:54`, `client/src/i18n/translations.ts:762-771`, `client/src/i18n/translations.ts:794`

#### social-account-11: Each social page styles its title differently

Medium · consistency · effort M

**Problem.** Operational sibling pages use five h1 treatments: /play makes the green Kicker the h1 (32px, 138,120); /leaderboard and the lobby use ink display-3 at 29px with no kicker; /profile has a 24px h1 inside the identity card; /cards puts a 24px h1 under a kicker with a 42px gap; /collection has an unstyled 32px h1 from Coding.css with a 14px gap. /settings/github, an operational callback, uses the 47px display hero that the contract reserves for public positioning. (/classroom is a public page, so its display hero is allowed.)

**Change.** Use the contract's operational header everywhere in this area: optional <Kicker>, then <Heading level={1} type='display-3'> in ink, one lead line, aligned to the column's left edge, 8px kicker gap. /play: <Kicker>Play live</Kicker> above an ink h1 such as 'Race or teach live'. /cards and /collection: one shared header component. /settings/github: see finding 21.

**Evidence.** `client/src/components/Play.tsx:258`, `client/src/components/Leaderboard.tsx:306`, `client/src/components/Play.tsx:904`, `client/src/components/Flashcards.tsx:200-204`, `client/src/components/Collection.tsx:79-81`, `client/src/coding/Coding.css:33`, `client/src/styles/app-shell.css:370`

#### social-account-13: /play topic and time choices take about 600px at 390

Medium · mobile · effort M

**Problem.** The 18 topic pills wrap to 4 rows at 1280 and 8 rows at 390 (32,548,322x394), with rows up to 47.7% empty. At 390 the time-limit group drops 'No limit' to a second row alone (76.5% empty). On a phone the Create button starts at y=1158, more than a full screen below the mode choice. 'No selection = questions from every topic' already makes 'all topics' the default.

**Change.** Below 600px, put the pills behind one 44px disclosure, 'Topics: all' (a native <details> or the existing button pattern), that opens the same pills; this saves about 330px. Give the time limit a 44px .ss-select ('Time limit: 1 min'), the control the Leaderboard topic filter already uses, so it fits one row. Keep the pills open by default at 900px and wider.

**Evidence.** `client/src/components/Play.tsx:304-335`, `client/src/components/Play.tsx:356-371`, `client/src/components/DeepEndScreens.css:24`

#### social-account-14: Lobby nests cards 3 deep and shows the room code 3 times

Medium · visual-noise · effort S

**Problem.** The lobby is a raised panel holding a muted QR tile and three participant rows that are each .ss-raised wrapped around a muted Card: panel inside card inside card, which the contract forbids ('canvas → one panel → rows'). The code REEF42 appears in the header badge (823,144), in the instruction 'Share the code REEF42 with players…' (345,347) and in the QR URL. The QR tile is 586px wide for a 164px image, leaving about 210px empty on its right.

**Change.** Participants become plain 56px rows with hairline dividers inside the one panel (avatar, name, Host tag). Instruction: 'Share the code, then press Start when everyone has joined.'; the badge carries the code. QR tile sized to content: QR left; 'Scan to join', the URL, and Copy link / Print invite (44px) stacked on the right, so the footer row holds only Start.

**Evidence.** `client/src/components/Play.tsx:1031-1097`, `client/src/i18n/translations.ts:680`

#### social-account-15: Lobby Start button wraps to a small left-aligned row at 390

Medium · mobile · effort S

**Problem.** At 390 the lobby action row wraps: Copy link and Print invite take the first row, and the host's primary 'Start (10 questions)' drops to a second row, left-aligned and 155px wide (33,888), with 51.6% of the row empty. The most important action on the page looks like an afterthought. On desktop it is 36px tall, next to 32px secondaries and a 28px code badge.

**Change.** Below 600px: Start full width on its own row first, the two secondaries as a 50/50 row under it (or moved beside the QR, finding 14). On desktop: one row, secondaries left, Start right, all three at 44px, and the code badge at 44px.

**Evidence.** `client/src/components/Play.tsx:1100-1121`

#### social-account-16: Sign-in gates use different widths, button sizes and chrome

Medium · states · effort S

**Problem.** The same 'sign in to use this' state looks different on each route. /play: a hand-built 480px raised card, no icon, 36px lg Log in (606,265). /cards: the shared StatePanel at 560px with a bookmark icon and a 32px md Log in (606,325). /collection questions tab: the same 560px panel as an h2 under the page header. Every desktop Log in is under 44px.

**Change.** Use the existing StatePanel on every gate (/play, /cards, /collection both tabs, /settings/github sign-in phase): 560px, centred, icon optional, h1 or h2 by context, one body line, one primary 'Log in' at 44px. Delete Play's hand-built card.

**Evidence.** `client/src/components/Play.tsx:177-194`, `client/src/components/Flashcards.tsx:156-162`, `client/src/components/SharkCards.css:19-24`

#### social-account-17: Profile cards use 3 card styles, 2 paddings and an unlabelled card

Medium · consistency · effort S

**Problem.** Sibling Profile cards are built three ways. Most are .ss-panel with 24px padding and a Kicker h2. Track and sections and GitHub garden are .ss-raised around a Card with 12px padding, so the GitHub kicker starts at x=655 while the Sharkname kicker below starts at x=667. Track and sections has no Kicker; its title is 12px grey supporting text (151,1088), the weakest text on the page. Account has a muted background. The Streak tiles are muted cards inside the panel, and the Longest-streak tile is 167px tall for about 70px of content.

**Change.** Every Profile card: .ss-panel, 24px padding, <Kicker as='h2'> (Track and sections gets 'TRACK'), plain surface. In Streaks, size both tiles to content (about 100px) and move 'Protect today and tomorrow' and its note under the pair, full width.

**Evidence.** `client/src/components/paths/LearningPathsCard.tsx:216-227`, `client/src/components/coding/GithubGardenCard.tsx:271-276`, `client/src/components/Profile.tsx:446-495`, `client/src/components/Profile.tsx:836`

#### social-account-18: On a phone, Profile is 4144px and five rows wrap a lone control

Medium · mobile · effort M

**Problem.** At 390 the Profile is 4144px tall, more than 5 screens. Five rows wrap and leave one item alone: the identity row puts the two icon buttons on their own line (70% empty); the plan link is alone on its line; the career row wraps the XP figure (67% empty); the Role row wraps 'Not available yet' (65.5% empty); and the sharkname row drops 'Save' to its own line (41,2642), 81.7% empty, away from the input it saves.

**Change.** Findings 04, 07 and 08 remove most of this. In addition: the sharkname input full width with Generate and Save as a 50/50 row under it; the XP figure on the career title's row (flex-wrap: nowrap, tabular numbers); the Role row's status as a second line under the role name. Target: under 3000px at 390.

**Evidence.** `client/src/components/SharknameCard.tsx:231-260`, `client/src/components/Friends.css:30`, `client/src/components/Profile.tsx:65-95`

#### social-account-20: /play repeats the scoring rule and frames the join code in a noisy box

Low · duplicate-text · effort S

**Problem.** 'score is correctness × speed bonus' is in the Multiplayer blurb (225,311) and again in 'How scoring works' (828,444). The subtitle 'Race friends in multiplayer, or run a classroom session' restates the two mode cards below it. The 'Match code' label inherits letter-spacing 0.32em from the wrapper, so it reads 'M a t c h   c o d e', and the input sits in a dashed tinted box inside a raised card, three frames around one field. The 30-word hint under Create wraps to two lines.

**Change.** Blurb: 'Everyone races to answer.' Keep the 'How scoring works' note. Drop the subtitle or make it new information. Apply monospace and letter-spacing to the input value only (.play-code input), and remove the dashed frame. Hint: 'Anyone with the code can join; you play too.'

**Evidence.** `client/src/i18n/translations.ts:644`, `client/src/i18n/translations.ts:647-648`, `client/src/components/Play.tsx:410-431`, `client/src/components/Play.tsx:443`

#### social-account-21: GitHub callback error uses a 47px hero and one small grey button

Low · hierarchy · effort S

**Problem.** /settings/github shows an operational failure ('The connection did not finish') as a 47px display hero (238,194) under a decorative fin and a hand-written kicker span (.ss-info-page__kicker, not <Kicker>). For this error the only way forward, 'Back to profile', is a 32px secondary (238,329), 48px below the body.

**Change.** Render each phase with StatePanel (560px, centred, 24px h1, one body line). When there is no retry, make 'Back to profile' a primary at 44px. Drop the fin; use <Kicker> if a kicker stays.

**Evidence.** `client/src/components/coding/GithubSettingsPage.tsx:137-152`, `client/src/styles/app-shell.css:368-372`

#### social-account-22: GitHub garden card says the same thing in 6 sentences

Low · duplicate-text · effort S

**Problem.** The not-connected card shows the tagline 'Every passed task becomes a commit in your own repository.' and then 'Each passed task is committed there as a file, one folder per track', the same promise twice. A 3-sentence permissions paragraph follows (655,1061, 55px), then a 28px Connect button alone on a right-aligned row. The card is 245px tall on a 2600px page.

**Change.** Keep the tagline and one line ('Pick one repository you own; devShark writes only there and keeps no GitHub token.'). Connect GitHub (44px primary) directly under it on the left. Move the full permissions detail into a 'How it works' disclosure or /settings/github. The card becomes about 150px.

**Evidence.** `client/src/components/coding/GithubGardenCard.tsx:182-195`, `client/src/components/coding/GithubGardenCard.tsx:275`
