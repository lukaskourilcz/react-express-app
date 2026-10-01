import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import SharknameCard from '../src/components/SharknameCard';
import { FriendsPanel } from '../src/components/FriendsPanel';

// "Your sharkname" (Profile Overview) and the friends list it feeds
// (migration 055). Each story answers the card's two reads.

const handle = (over: Record<string, unknown> = {}) =>
  http.get('*/api/user/friends-handle', () => HttpResponse.json({
    handle: 'thirsty-sharkie', discoverable: true, country: 'CZ', canChangeAt: '2026-09-01T00:00:00Z', ...over,
  }));
const identity = (over: Record<string, unknown> = {}) =>
  http.get('*/api/user/identity', () => HttpResponse.json({
    showRealName: false, showPhoto: false, realName: 'Ada Lovelace', photo: null, ...over,
  }));
const saves = [
  http.put('*/api/user/friends-handle', async ({ request }) => HttpResponse.json(await request.json())),
  http.put('*/api/user/identity', async ({ request }) => HttpResponse.json({
    showRealName: false, showPhoto: false, realName: 'Ada Lovelace', photo: null, ...(await request.json() as object),
  })),
];

const meta = { title: 'Screens/Sharkname', component: SharknameCard } satisfies Meta<typeof SharknameCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = { parameters: { msw: { handlers: [handle(), identity(), ...saves] } } };
export const ShowsName: Story = { parameters: { msw: { handlers: [handle(), identity({ showRealName: true }), ...saves] } } };
export const EmailAccount: Story = { parameters: { msw: { handlers: [handle({ handle: 'shark-so-fat-it-cant-swim-at-all' }), identity({ realName: null, photo: null }), ...saves] } } };
export const NoSharkname: Story = { parameters: { msw: { handlers: [handle({ handle: null, canChangeAt: null, country: null }), identity(), ...saves] } } };
export const Cooldown: Story = { parameters: { msw: { handlers: [handle({ canChangeAt: '2099-10-21T00:00:00Z' }), identity(), ...saves] } } };
export const Taken: Story = {
  parameters: {
    msw: {
      handlers: [handle(), identity(), http.put('*/api/user/friends-handle', () =>
        HttpResponse.json({ error: { code: 'handle_taken', message: 'That sharkname is already taken' } }, { status: 409 }))],
    },
  },
};
export const Loading: Story = { parameters: { msw: { handlers: [http.get('*/api/user/friends-handle', async () => { await delay('infinite'); return HttpResponse.json({}); }), identity()] } } };
export const LoadFailed: Story = { parameters: { msw: { handlers: [handle(), http.get('*/api/user/identity', () => HttpResponse.json({ error: { code: 'db_error', message: 'x' } }, { status: 500 }))] } } };

const friend = (over: Record<string, unknown>) => ({
  handle: 'x', displayName: 'x', picture: null, country: null, crown: false,
  currentStreak: 3, longestStreak: 9, totalCorrect: 40, totalQuestions: 50, accuracyPct: 80, activeToday: false,
  ...over,
});

export const FriendsList: StoryObj<typeof FriendsPanel> = {
  render: () => <FriendsPanel onEditSharkname={() => undefined} />,
  parameters: {
    msw: {
      handlers: [
        handle(),
        http.get('*/api/user/friends-list', () => HttpResponse.json({
          friends: [
            friend({ handle: 'el-tiburon-tremendo', displayName: 'el-tiburon-tremendo', country: 'NG', crown: true, currentStreak: 45, activeToday: true }),
            friend({ handle: 'muy-thirsty-sharkie', displayName: 'Lena Example', country: 'DE' }),
            friend({ handle: 'sharky-mc-burritoface', displayName: 'sharky-mc-burritoface', country: 'SE' }),
            friend({ handle: 'fin-de-siesta', displayName: 'fin-de-siesta', country: 'CZ', currentStreak: 0 }),
          ],
          requests: [
            { handle: 'mucho-drama-fin', displayName: 'Nina Example', direction: 'incoming' },
            { handle: 'gracias-sharkie', displayName: 'gracias-sharkie', direction: 'outgoing' },
          ],
        })),
      ],
    },
  },
};
