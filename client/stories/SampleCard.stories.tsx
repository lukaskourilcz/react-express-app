import type { Meta, StoryObj } from '@storybook/react-vite';
import { SampleCard } from '../src/components/landing/LandingKit';
const meta = { title: 'Astryx/Practice sample', component: SampleCard, args: { chip: 'JavaScript', question: {
  text: 'What does this expression return?', code: '[1, 2].map(n => n * 2)', opts: ['[2, 4]', '[1, 2, 1, 2]', '4'], a: 0,
  e: 'map returns a new array containing the result of calling the function for each element.',
} } } satisfies Meta<typeof SampleCard>;
export default meta;
export const Unanswered: StoryObj<typeof meta> = {};
