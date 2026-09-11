import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/manrope/wght.css';
import { useEffect, useState } from 'react';
import type { Preview } from '@storybook/react-vite';
import { mswLoader } from 'msw-storybook-addon/csf3';
import { setupWorker } from 'msw/browser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../src/i18n/LanguageContext';
import { ColorModeProvider, useColorMode } from '../src/theme/ColorModeContext';
import { MotionProvider } from '../src/lib/motion';
import '../src/styles/reset.css';
import '../src/styles/astryx-theme.css';
import '../src/styles/app-shell.css';

function Environment({ children, lang, theme }: { children: React.ReactNode; lang: 'en' | 'cs'; theme: string }) {
  const language = useLanguage(); const color = useColorMode();
  useEffect(() => { language.setLang(lang); }, [lang, language.setLang]);
  useEffect(() => { if (color.mode !== theme) color.toggle(); }, [theme, color.mode, color.toggle]);
  return <main style={{ padding: 'var(--ss-space-gutter)', maxWidth: 1000, margin: 'auto' }}>{children}</main>;
}
function Providers({ children, lang, theme }: { children: React.ReactNode; lang: 'en' | 'cs'; theme: string }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }));
  return <QueryClientProvider client={client}><MemoryRouter><LanguageProvider><ColorModeProvider><MotionProvider><Environment lang={lang} theme={theme}>{children}</Environment></MotionProvider></ColorModeProvider></LanguageProvider></MemoryRouter></QueryClientProvider>;
}
const preview: Preview = {
  loaders: [mswLoader(async () => { const worker = setupWorker(); await worker.start({ onUnhandledRequest(request, print) { if (new URL(request.url).pathname.startsWith('/api/')) print.error(); } }); return worker; })],
  globalTypes: {
    locale: { toolbar: { title: 'Language', items: ['en', 'cs'] } },
    theme: { toolbar: { title: 'Theme', items: ['light', 'dark'] } },
  },
  initialGlobals: { locale: 'en', theme: 'light' },
  parameters: { a11y: { test: 'error' }, layout: 'fullscreen' },
  decorators: [(Story, context) => <Providers key={context.id} lang={context.globals.locale} theme={context.globals.theme}><Story /></Providers>],
};
export default preview;
