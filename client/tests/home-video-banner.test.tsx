import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { HomeVideoBanner } from '../src/components/landing/HomeVideoBanner';

it('shows an honest placeholder without a missing-video request or fake play action', () => {
  const { container } = render(<LanguageProvider><HomeVideoBanner /></LanguageProvider>);
  expect(screen.getByRole('region', { name: 'devShark product video' })).toHaveTextContent('Product video coming soon.');
  expect(screen.queryByRole('button')).toBeNull();
  expect(container.querySelector('video, source')).toBeNull();
});

it('plays a supplied recording only on request and retains its poster and fallback', () => {
  const { container } = render(<LanguageProvider><HomeVideoBanner video={{
    webmSrc: '/media/product.webm', posterSrc: '/media/product.webp', mp4Src: '/media/product.mp4',
  }} /></LanguageProvider>);
  const video = container.querySelector('video');
  expect(video).toHaveAttribute('controls');
  expect(video).toHaveAttribute('playsinline');
  expect(video).toHaveAttribute('poster', '/media/product.webp');
  expect(video).toHaveAttribute('preload', 'none');
  expect(video).not.toHaveAttribute('autoplay');
  expect(video).not.toHaveAttribute('loop');
  expect(video?.muted).toBe(true);
  expect(video?.querySelectorAll('source')).toHaveLength(2);
  expect(video?.querySelector('source[type="video/webm"]')).toHaveAttribute('src', '/media/product.webm');
  expect(video?.querySelector('source[type="video/mp4"]')).toHaveAttribute('src', '/media/product.mp4');
});
