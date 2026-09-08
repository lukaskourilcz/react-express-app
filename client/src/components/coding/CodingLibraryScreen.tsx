// Saved challenges and named collections (issue #157).
//
// The library is a reading list. A saved challenge that the learner's plan does
// not currently open stays listed with an explanation and cannot be launched; a
// challenge that has left the catalogue stays listed too, so the history still
// makes sense. Every control is a button, ordering is done with move buttons
// rather than a drag, and each mutation replaces the whole library in the cache
// so two tabs cannot drift apart.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../lib/auth';
import { Kicker } from '../landing/LandingKit';
import { useCodingLibrary, useCodingLibraryAction } from '../../lib/codingLibrary';
import { useEligibility } from '../../lib/learningPlan';
import { useCodingProgress } from '../../coding/api';
import { CODING_INDEX } from '../../../../shared/coding-index';
import { codingSectionTasks, tierUnlocked, type CodingTaskSummary } from '../../../../shared/coding-catalog';
import '../../coding/Coding.css';

const SECTION_INDEX = codingSectionTasks(CODING_INDEX);

export function CodingLibraryScreen() {
  const { t, lang } = useLanguage();
  const { isAuthenticated } = useAuth();
  const library = useCodingLibrary(isAuthenticated);
  const act = useCodingLibraryAction();
  const eligibility = useEligibility(isAuthenticated);
  const progress = useCodingProgress(isAuthenticated);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Renaming happens in place. A window.prompt would be unstyled, unlocalised
  // and modal over the whole tab, which is none of what this needs.
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);

  const passed = useMemo(
    () => new Set(Object.entries(progress.data?.tasks ?? {}).filter(([, row]) => row.status === 'passed').map(([id]) => id)),
    [progress.data],
  );
  const planTopics = eligibility.data?.personalized ? new Set(eligibility.data.unlockedTopics) : null;

  const startable = (task: CodingTaskSummary): boolean => {
    if (planTopics && !planTopics.has(task.track)) return false;
    return tierUnlocked({
      track: task.track,
      tier: task.tier,
      progress: { passed },
      tasks: CODING_INDEX,
      javascriptLevelsCleared: progress.data?.javascriptLevelsCleared ?? 0,
    });
  };

  const renderEntry = (taskId: string, collectionId?: string, collectionName?: string) => {
    const task = SECTION_INDEX.find((one) => one.id === taskId);
    if (!task) {
      return (
        <li key={taskId} className="cd-row cd-row--retired">
          <span className="cd-row__title"><code>{taskId}</code></span>
          <span className="cd-row__meta">{t('coding.library.retiredNote')}</span>
        </li>
      );
    }
    const open = startable(task);
    const title = task.title[lang] || task.title.en;
    return (
      <li key={taskId} className="cd-row">
        <span className="cd-row__title">
          {open ? <Link className="cd-link" to={`/coding/${task.track}/${task.id}`}>{title}</Link> : title}
        </span>
        <span className="cd-row__meta">
          {!open && <span>{t('coding.library.lockedNote')}</span>}
          {collectionId && collectionName && (
            <button
              type="button"
              className="cd-btn cd-btn--quiet"
              onClick={() => act.mutate({ action: 'remove-from-collection', id: collectionId, taskId })}
            >
              {t('coding.library.removeFrom', { name: collectionName })}
            </button>
          )}
          {!collectionId && (
            <button type="button" className="cd-btn cd-btn--quiet" onClick={() => act.mutate({ action: 'unbookmark', taskId })}>
              {t('coding.library.unsave')}
            </button>
          )}
        </span>
      </li>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="cd-page ss-pop">
        <header>
          <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
          <h1>{t('coding.library.title')}</h1>
        </header>
        <p className="cd-note">{t('coding.library.signIn')}</p>
      </div>
    );
  }

  const data = library.data;
  const collections = data?.collections ?? [];

  return (
    <div className="cd-page ss-pop">
      <header>
        <Kicker><Link className="cd-link" to="/coding">{t('coding.title')}</Link></Kicker>
        <h1>{t('coding.library.title')}</h1>
        <p className="cd-lead">{t('coding.library.subtitle')}</p>
      </header>

      {library.isLoading && <p className="cd-note" role="status">{t('common.loading')}</p>}
      {library.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.loadError')}</p>}
      {act.isError && <p className="cd-note cd-note--error" role="alert">{t('coding.library.error')}</p>}

      {data && (
        <>
          <section aria-labelledby="cd-lib-bookmarks">
            <h2 id="cd-lib-bookmarks" className="ss-kicker">{t('coding.library.saved')}</h2>
            {data.bookmarks.length === 0
              ? <p className="cd-note">{t('coding.library.empty')}</p>
              : <ul className="cd-rows">{data.bookmarks.map((id) => renderEntry(id))}</ul>}
          </section>

          <section aria-labelledby="cd-lib-collections">
            <h2 id="cd-lib-collections" className="ss-kicker">{t('coding.library.collections')}</h2>
            <form
              className="cd-actions"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = name.trim();
                if (!trimmed) return;
                act.mutate({ action: 'create-collection', name: trimmed }, { onSuccess: () => setName('') });
              }}
            >
              <label className="cd-editor-label" htmlFor="cd-new-collection">{t('coding.library.newCollectionLabel')}</label>
              <input
                id="cd-new-collection"
                className="cd-input"
                value={name}
                maxLength={data.limits.nameLength}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('coding.library.newCollection')}
              />
              <button type="submit" className="cd-btn cd-btn--primary" disabled={!name.trim() || act.isPending}>
                {t('coding.library.create')}
              </button>
            </form>

            {collections.map((collection, index) => (
              <section key={collection.id} className="cd-tier" aria-labelledby={`cd-col-${collection.id}`}>
                <div className="cd-tier__head">
                  <h3 id={`cd-col-${collection.id}`}>{collection.name}</h3>
                  <div className="cd-actions">
                    <button
                      type="button"
                      className="cd-btn cd-btn--quiet"
                      disabled={index === 0}
                      aria-label={t('coding.library.moveUp', { name: collection.name })}
                      onClick={() => {
                        const ids = collections.map((one) => one.id);
                        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                        act.mutate({ action: 'reorder-collections', ids });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="cd-btn cd-btn--quiet"
                      disabled={index === collections.length - 1}
                      aria-label={t('coding.library.moveDown', { name: collection.name })}
                      onClick={() => {
                        const ids = collections.map((one) => one.id);
                        [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]];
                        act.mutate({ action: 'reorder-collections', ids });
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="cd-btn cd-btn--quiet"
                      aria-expanded={renaming?.id === collection.id}
                      onClick={() => setRenaming(renaming?.id === collection.id ? null : { id: collection.id, value: collection.name })}
                    >
                      {t('coding.library.rename')}
                    </button>
                    <button type="button" className="cd-btn cd-btn--quiet" onClick={() => setConfirmDelete(collection.id)}>
                      {t('coding.library.delete')}
                    </button>
                  </div>
                </div>
                {renaming?.id === collection.id && (
                  <form
                    className="cd-actions"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const trimmed = renaming.value.trim();
                      if (!trimmed) return;
                      act.mutate({ action: 'rename-collection', id: collection.id, name: trimmed }, { onSuccess: () => setRenaming(null) });
                    }}
                  >
                    <label className="cd-editor-label" htmlFor={`cd-rename-${collection.id}`}>{t('coding.library.newCollectionLabel')}</label>
                    <input
                      id={`cd-rename-${collection.id}`}
                      className="cd-input"
                      autoFocus
                      maxLength={data.limits.nameLength}
                      value={renaming.value}
                      onChange={(event) => setRenaming({ id: collection.id, value: event.target.value })}
                    />
                    <button type="submit" className="cd-btn cd-btn--primary" disabled={!renaming.value.trim() || act.isPending}>
                      {t('coding.library.rename')}
                    </button>
                    <button type="button" className="cd-btn" onClick={() => setRenaming(null)}>{t('coding.retry')}</button>
                  </form>
                )}
                {confirmDelete === collection.id && (
                  <div className="cd-note cd-note--warn" role="alertdialog" aria-label={t('coding.library.delete')}>
                    <p style={{ margin: '0 0 8px' }}>{t('coding.library.deleteConfirm')}</p>
                    <div className="cd-actions">
                      <button
                        type="button"
                        className="cd-btn cd-btn--primary"
                        onClick={() => { act.mutate({ action: 'delete-collection', id: collection.id }); setConfirmDelete(null); }}
                      >
                        {t('coding.library.delete')}
                      </button>
                      <button type="button" className="cd-btn" onClick={() => setConfirmDelete(null)} autoFocus>{t('coding.retry')}</button>
                    </div>
                  </div>
                )}
                {collection.taskIds.length === 0
                  ? <p className="cd-note">{t('coding.library.collectionEmpty')}</p>
                  : <ul className="cd-rows">{collection.taskIds.map((id) => renderEntry(id, collection.id, collection.name))}</ul>}
              </section>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
