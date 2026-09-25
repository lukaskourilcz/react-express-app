// The small public pages that share one layout (`Page`): the classroom
// invitation and the not-found page. The Terms and the privacy policy live in
// LegalPages.tsx; the voluntary-support page is retired (#222) and /support
// redirects to /premium.
import { Button } from '@astryxdesign/core/Button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { SwimmingFin } from './SharkFin';

const COPY = {
  en: {
    classroomTitle: 'Run a focused classroom challenge.', classroomLead: 'Create a host-led room, share one link or QR code, and let signed-in learners join the same subject session.', classroomCta: 'Create a classroom', classroomJoin: 'Join with a room code', classroomNote: 'Participants sign in, open the room link, and the host controls question progress.',
    notFoundTitle: 'That page is out of the water.', notFoundLead: 'The address may be old or incomplete. Your learning progress is safe.', home: 'Go home', back: 'Go back',
  },
  cs: {
    classroomTitle: 'Uspořádej soustředěnou výzvu pro třídu.', classroomLead: 'Vytvoř místnost vedenou hostitelem, sdílej jeden odkaz nebo QR kód a nech přihlášené studenty připojit se ke stejnému předmětu.', classroomCta: 'Vytvořit třídu', classroomJoin: 'Připojit se kódem', classroomNote: 'Účastníci se přihlásí, otevřou odkaz místnosti a hostitel řídí postup otázkami.',
    notFoundTitle: 'Tahle stránka odplavala.', notFoundLead: 'Adresa může být stará nebo neúplná. Tvůj studijní postup je v bezpečí.', home: 'Domů', back: 'Zpět',
  },
} as const;

export function Page({ kicker, title, lead, children }: { kicker?: string; title: string; lead: string; children: React.ReactNode }) {
  return <article className="ss-info-page">
    <header className="ss-info-page__header">
      <SwimmingFin size={26} />
      {kicker && <span className="ss-info-page__kicker">{kicker}</span>}
      <h1>{title}</h1>
      <p>{lead}</p>
    </header>
    {children}
  </article>;
}

export function ClassroomPage() {
  const { lang } = useLanguage(); const c = COPY[lang]; const navigate = useNavigate();
  return <Page title={c.classroomTitle} lead={c.classroomLead}><section className="ss-info-card"><div className="ss-info-actions"><Button variant="primary" label={c.classroomCta} onClick={() => navigate('/play?mode=classroom')} /><Button variant="secondary" label={c.classroomJoin} onClick={() => navigate('/play')} /></div><p>{c.classroomNote}</p></section></Page>;
}

export function NotFoundPage() {
  const { lang } = useLanguage(); const c = COPY[lang]; const navigate = useNavigate();
  return <Page title={c.notFoundTitle} lead={c.notFoundLead}><div className="ss-info-actions"><Button variant="primary" label={c.home} onClick={() => navigate('/')} /><Button variant="secondary" label={c.back} onClick={() => navigate(-1)} /></div></Page>;
}
