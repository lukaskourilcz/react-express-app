import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@astryxdesign/core/Button';
import { useColorMode } from '../../theme/ColorModeContext';
import { SUBJECT_ORDER, SUBJECTS, isSubjectLocked, useSubject, type SubjectId } from '../../lib/subjects';
import DevQuestions from './DevQuestions';
import DevTriage from './DevTriage';
import DevReports from './DevReports';
import DevLogs from './DevLogs';
import DevSettings from './DevSettings';
import './DevConsole.css';

type Tab = 'questions' | 'triage' | 'flags' | 'logs' | 'settings';

const NAV: { id: Tab; label: string; description: string; icon: string }[] = [
  { id: 'questions', label: 'Question bank', description: 'Create, filter and edit', icon: '◫' },
  { id: 'triage', label: 'Quality triage', description: 'Find content to improve', icon: '◇' },
  { id: 'flags', label: 'Learner flags', description: 'Review reported questions', icon: '⚑' },
  { id: 'logs', label: 'Activity log', description: 'Track authentication events', icon: '≋' },
  { id: 'settings', label: 'App settings', description: 'Tune features and balance', icon: '⚙' },
];

const TAB_IDS = new Set<Tab>(NAV.map((item) => item.id));
const PREVIEWS = [{ to: '/', label: 'Home' }, { to: '/quiz', label: 'Quiz' }, { to: '/learn', label: 'Learn' }, { to: '/profile', label: 'Profile' }];

/** Password-gated admin workspace with persistent app-context controls. */
export default function DevConsole({ onLock }: { onLock: () => void }) {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('section') as Tab | null;
  const tab = requestedTab && TAB_IDS.has(requestedTab) ? requestedTab : 'questions';
  const [subject, setSubject] = useSubject();
  const activeSubject = SUBJECTS[subject];
  const { mode, toggle: toggleColorMode } = useColorMode();
  const activeNav = NAV.find((item) => item.id === tab) ?? NAV[0];

  const selectTab = (next: Tab) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'questions') nextParams.delete('section');
    else nextParams.set('section', next);
    setParams(nextParams, { replace: true });
  };

  return (
    <div className="dev-shell">
      <aside className="dev-sidebar" aria-label="Developer console">
        <div className="dev-brand"><span className="dev-brand-fin" aria-hidden="true" /><div><strong>StudyShark</strong><span>Control room</span></div></div>

        <div className="dev-context-card">
          <span className="dev-eyebrow">App context</span>
          <label htmlFor="dev-subject">Preview and edit as</label>
          <div className="dev-context-select-wrap">
            <span aria-hidden="true">{activeSubject.emoji}</span>
            <select id="dev-subject" value={subject} disabled={isSubjectLocked()} onChange={(event) => setSubject(event.target.value as SubjectId)}>
              {SUBJECT_ORDER.map((id) => <option key={id} value={id}>{SUBJECTS[id].label}</option>)}
            </select>
          </div>
          <p>{activeSubject.topics.length} paths · {activeSubject.categories.length} categories</p>
          <Link className="dev-open-app" to="/">Open learner app <span aria-hidden="true">↗</span></Link>
        </div>

        <nav className="dev-nav" aria-label="Admin sections">
          <span className="dev-nav-label">Workspace</span>
          {NAV.map((item) => (
            <button key={item.id} type="button" className="dev-nav-item" data-active={tab === item.id} onClick={() => selectTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
              <span className="dev-nav-icon" aria-hidden="true">{item.icon}</span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </nav>

        <div className="dev-sidebar-footer">
          <button type="button" onClick={toggleColorMode}>{mode === 'dark' ? '☀ Light mode' : '◐ Dark mode'}</button>
          <button type="button" onClick={onLock}>⌁ Lock console</button>
        </div>
      </aside>

      <main className="dev-main" id="main-content" tabIndex={-1}>
        <header className="dev-mobile-header">
          <div className="dev-brand"><span className="dev-brand-fin" aria-hidden="true" /><strong>Control room</strong></div>
          <Button variant="secondary" size="sm" label="Lock" onClick={onLock} />
        </header>
        <div className="dev-mobile-controls">
          <label><span>Section</span><select value={tab} onChange={(event) => selectTab(event.target.value as Tab)}>{NAV.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label><span>App context</span><select value={subject} disabled={isSubjectLocked()} onChange={(event) => setSubject(event.target.value as SubjectId)}>{SUBJECT_ORDER.map((id) => <option key={id} value={id}>{SUBJECTS[id].emoji} {SUBJECTS[id].label}</option>)}</select></label>
        </div>

        <div className="dev-main-inner">
          <div className="dev-page-heading">
            <div><span className="dev-eyebrow">Control room / {activeSubject.label}</span><h1>{activeNav.label}</h1><p>{activeNav.description}. Changes apply to the live app configuration.</p></div>
            <div className="dev-preview-links" aria-label="Preview app pages"><span>Quick preview</span><div>{PREVIEWS.map((preview) => <Link key={preview.to} to={preview.to}>{preview.label} ↗</Link>)}</div></div>
          </div>

          <section className="dev-workspace" aria-label={activeNav.label}>
            {tab === 'questions' ? <DevQuestions /> : tab === 'triage' ? <DevTriage /> : tab === 'flags' ? <DevReports /> : tab === 'logs' ? <DevLogs /> : <DevSettings />}
          </section>
        </div>
      </main>
    </div>
  );
}
