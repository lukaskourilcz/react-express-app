// "Find devShark elsewhere": links to devShark's own profiles, on the Profile
// and at the end of the Rewards screen (#227).
//
// The links carry no reward by default. Meta's spam rules forbid paying for
// engagement and coins buy merchandise, so the owner's `socialVisitGrant`
// ships at 0 (shared/rewards.ts has the note). When the owner sets it, the copy
// thanks a signed-in learner for visiting; it never asks anyone to follow.
// The URLs come from client/product-catalog.ts, and a profile the owner has not
// created yet is not shown. With none set, this renders nothing.
import { useId, useState } from 'react';
import { SOCIAL_PROFILES } from '../../product-catalog';
import { Kicker } from './landing/LandingKit';
import { AppToast } from './ui/AppToast';
import { useT } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { useAuth } from '../lib/auth';
import { useGameConfig } from '../lib/gameConfig';
import { useSocialVisitMutation } from '../lib/rewards';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '../../../shared/rewards';
import './Rewards.css';

export function SocialProfiles({
  profiles = SOCIAL_PROFILES,
  framed = false,
}: {
  profiles?: Readonly<Record<SocialPlatform, string | null>>;
  /** On the Profile it sits among the cards, so it gets the card surface. */
  framed?: boolean;
}) {
  const t = useT();
  const { isAuthenticated } = useAuth();
  const grant = useGameConfig().coins.socialVisitGrant;
  const visit = useSocialVisitMutation();
  const [thanked, setThanked] = useState<number | null>(null);
  const headingId = useId();
  const links = SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = profiles[platform];
    return url ? [{ platform, url }] : [];
  });
  if (links.length === 0) return null;

  const paid = grant > 0 && isAuthenticated;
  return (
    <section className={framed ? 'rw-social rw-social--card ss-raised' : 'rw-social'} aria-labelledby={headingId}>
      <Kicker as="h2" id={headingId}>{t('rewards.social.title')}</Kicker>
      <p className="rw-muted">{t('rewards.social.body')}</p>
      {paid && <p className="rw-muted">{t('rewards.social.thanks', { n: grant })}</p>}
      <ul className="rw-social__links">
        {links.map(({ platform, url }) => (
          <li key={platform}>
            <a
              className="rw-social__link"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!paid) return;
                visit.mutate(platform, {
                  onSuccess: (result) => { if (result.granted) setThanked(result.coins); },
                });
              }}
            >
              {t(`rewards.social.${platform}` as TranslationKey)}
              <span className="rw-sr-only"> {t('rewards.social.newTab')}</span>
            </a>
          </li>
        ))}
      </ul>
      <AppToast
        open={thanked !== null}
        onClose={() => setThanked(null)}
        severity="success"
        autoHideDuration={4000}
        message={thanked !== null ? t('rewards.social.thanked', { n: thanked }) : ''}
      />
    </section>
  );
}

export default SocialProfiles;
