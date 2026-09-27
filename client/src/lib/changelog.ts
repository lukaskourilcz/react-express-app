// What changed in devShark, newest first: the data behind /changelog (#239).
//
// Plain data on purpose. The page renders it in the app, the build renders
// the same entries into the static HTML of /changelog (vite.config.ts), and a
// social post on a release day links here. Add an entry in the same change
// that ships something a learner can see; write what changed for them, in
// plain English, with the date it reached devshark.app. No screenshots or
// clips live here: they go into the post.
import { FREE_LEARN_LEVELS, PREMIUM_PRICE } from '../../../shared/tiers';

export interface ChangelogItem {
  title: string;
  body: string;
  /** An app path to try the change, with its label. */
  link?: { href: string; label: string };
}

export interface ChangelogEntry {
  /** The day it reached devshark.app, YYYY-MM-DD. */
  date: string;
  items: readonly ChangelogItem[];
}

const reactFree = FREE_LEARN_LEVELS.react ?? 0;
const price = `${PREMIUM_PRICE.symbol}${PREMIUM_PRICE.monthly} a month or ${PREMIUM_PRICE.symbol}${PREMIUM_PRICE.annual} a year`;

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: '2026-09-28',
    items: [
      {
        title: 'A question of the day',
        body: 'Every day /daily puts up one devShark question, from a different track each day. Pick an answer and check it: the server grades it and explains the answer. No account needed, and nothing you answer there counts towards scores or streaks.',
        link: { href: '/daily', label: 'Answer today’s question' },
      },
      {
        title: 'Share a result card',
        body: 'The Biggest Shark Challenge and the typing racer make a result card with your score or your speed and accuracy, and the date. Download it or share it. The card never shows your name.',
        link: { href: '/typing', label: 'Race the typing racer' },
      },
      {
        title: 'Invite a friend at the right moment',
        body: 'Your invite link now appears after your first passed Learn level and after each Challenge run, with a share button and a copy button. When a friend signs up with it and finishes their first Learn level, you both get coins, as before.',
      },
      {
        title: 'Coding challenges get their own link preview',
        body: 'A link to a coding challenge now shows its title, track and difficulty when you share it, instead of the same picture for every page.',
        link: { href: '/coding', label: 'Browse coding challenges' },
      },
      {
        title: 'This changelog',
        body: 'Dated notes on what changed, linked from the footer.',
      },
    ],
  },
  {
    date: '2026-09-27',
    items: [
      {
        title: 'A new devShark logo and a calmer design',
        body: 'devShark has a new logo with a cleaner fin. A design review tidied the homepage, the Challenge intro, the Profile, the coding home and the dark theme, and made buttons, icons and cards consistent.',
      },
    ],
  },
  {
    date: '2026-09-25',
    items: [
      {
        title: 'devShark is freemium',
        body: `Every account gets HTML, CSS and JavaScript in full, React levels 1 to ${reactFree}, stage one of every coding project and short path, and a starter set of coding challenges, plus every quiz, the daily challenge, the Challenge, multiplayer rooms and leaderboards. Premium opens the rest for ${price}, VAT included. Premium changes which content you can start, never grading, scores or streaks.`,
        link: { href: '/premium', label: 'See what Premium opens' },
      },
    ],
  },
];

/** "28 September 2026", the same in the app and in the static HTML. */
export const changelogDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
