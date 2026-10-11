import { useT } from '../../i18n/LanguageContext';
import { PlayIcon } from '../ui/icons';

interface ProductVideo {
  webmSrc: string;
  posterSrc: string;
  mp4Src?: string;
}

/** Supply the finished recording and a matching poster when they are ready. */
export function HomeVideoBanner({ video }: { video?: ProductVideo }) {
  const t = useT();
  return (
    <section className="ss-panel ss-home-video" aria-label={t('home.video.aria')}>
      {video ? (
        <video controls playsInline muted preload="none" poster={video.posterSrc} aria-label={t('home.video.aria')}>
          <source src={video.webmSrc} type="video/webm" />
          {video.mp4Src && <source src={video.mp4Src} type="video/mp4" />}
          {t('home.video.unavailable')}
        </video>
      ) : (
        <div className="ss-home-video__placeholder">
          <span className="ss-home-video__symbol" aria-hidden="true"><PlayIcon size={24} /></span>
          <h2>{t('home.video.title')}</h2>
          <p>{t('home.video.pending')}</p>
        </div>
      )}
    </section>
  );
}
