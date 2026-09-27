// The static HTML body of /daily and /daily/<date> (#239), written by the
// build (vite.config.ts). It names the day and its track and holds no
// question: the question, its options and its answer come from the server
// when the page runs, so nothing of it sits in the HTML. Pure: no hooks.
import type { TranslationKey } from '../i18n/translations';
import BrandCase from './BrandCase';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export function DailyStaticArticle({ t, track, dateLabel, date }: { t: Translate; track?: string; dateLabel?: string; date?: string }) {
  return (
    <article className="ss-info-page ss-daily">
      <header className="ss-info-page__header">
        <span className="ss-info-page__kicker"><BrandCase text={t('daily.kicker')} /></span>
        <h1>{track ? t('daily.title', { track }) : t('daily.titlePlain')}</h1>
        {date && dateLabel && <p className="ss-daily__date"><time dateTime={date}>{dateLabel}</time></p>}
        <p>{t('daily.lead')}</p>
      </header>
      {/* The app replaces this page when it starts; until then, or without
          JavaScript, this line says where the question is. */}
      <p className="ss-daily__noscript">{t('daily.noScript')}</p>
    </article>
  );
}
