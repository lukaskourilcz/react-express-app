// The Big O introduction's opening screen (/learn/big-o, UX audit learn-19):
// the Learn page header with "Big O guide" as the context link above the h1
// (as the FDE module page's kicker), then the two lessons side by side, the
// first as the one SwimCta md and the second a 44px secondary, each with its
// place in the pair under it. The guide's paragraph is not repeated here.
import { Link } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { SwimCta } from '../landing/LandingKit';
import { useLanguage } from '../../i18n/LanguageContext';
import { LearnPageHeader } from './LearnPageHeader';
import './BigOLessons.css';

export function BigOLessons({ onOpen }: { onOpen: (lesson: 1 | 2) => void }) {
  const { t } = useLanguage();
  return (
    <div className="de-page">
      <LearnPageHeader
        context={<Link to="/big-o">{t('bigO.guide')}</Link>}
        title={t('bigO.pathTitle')}
        lead={t('bigO.pathLead')}
      />
      <ul className="bo-lessons">
        <li className="bo-lesson">
          <SwimCta label={t('bigO.firstLesson')} onClick={() => onOpen(1)} />
          <span className="bo-lesson__count">{t('bigO.lessonOf', { n: 1, total: 2 })}</span>
        </li>
        <li className="bo-lesson">
          <Button className="ss-action" variant="secondary" label={t('bigO.secondLesson')} onClick={() => onOpen(2)} />
          <span className="bo-lesson__count">{t('bigO.lessonOf', { n: 2, total: 2 })}</span>
        </li>
      </ul>
    </div>
  );
}

export default BigOLessons;
