import type { Meta, StoryObj } from '@storybook/react-vite';
import { HomeVideoBanner } from '../src/components/landing/HomeVideoBanner';

const meta = { title: 'Astryx/Product video banner', component: HomeVideoBanner } satisfies Meta<typeof HomeVideoBanner>;
export default meta;
export const Pending: StoryObj<typeof meta> = {};
