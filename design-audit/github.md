repo: lukaskourilcz/react-express-app
branch: main
path: client/src

## Last sync
date: 2026-09-27T19:30:49Z
### Updated in this project
- Pre-launch design audit: seven section pages (recreated current screens + findings) and an overview with design-system audit and prioritised list
- Shared `AppShell.dc.html` header recreated from App.tsx + app-shell.css
- Brand mark copied from client/public/favicon.svg

## Screen map
| Project screen | Repo files |
|---|---|
| AppShell.dc.html | client/src/App.tsx, client/src/styles/app-shell.css, client/src/styles/astryx-theme.css |
| 00 Audit overview.dc.html | DESIGN_RULES.md, docs/design/design-system.md, docs/brand/brand-guidelines.md, client/src/styles/*.css, client/src/components/DeepEndScreens.css, client/src/components/Leaderboard.css, client/src/components/landing/landingSections.css |
| 01 Homepage.dc.html | client/src/components/Home.tsx, client/src/components/landing/LandingKit.tsx, client/src/components/landing/ComparisonTable.tsx, client/src/components/landing/FounderNote.tsx, client/src/lib/landingTopics.ts, client/src/i18n/translations.ts (home.*, landing.*) |
| 02 Profile.dc.html | client/src/components/Profile.tsx, client/src/components/DeepEndScreens.css |
| 03 Leaderboard.dc.html | client/src/components/Leaderboard.tsx, client/src/components/Leaderboard.css, translations.ts (leaderboard.*) |
| 04 Rewards.dc.html | client/src/components/Shop.tsx, translations.ts (shop.*, rewards.*) |
| 05 Coding.dc.html | client/src/components/coding/CodingSection.tsx, client/src/coding/CodingWorkbench.tsx (class structure), translations.ts (coding.*) |
| 06 Quiz.dc.html | client/src/components/Quiz.tsx, translations.ts (quiz.*, difficulty.*) |
| 07 Challenge.dc.html | client/src/components/Challenge.tsx, client/src/components/DeepEndScreens.css, translations.ts (challenge.*) |
