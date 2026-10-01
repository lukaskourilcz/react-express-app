// /daily and /daily/:date: the public question of the day (#239).
//
// One question a day, from a track that rotates by date
// (shared/daily-question.ts). The server picks the question and keeps its
// answer sealed in the session until the learner checks one; the check is
// practice and records nothing for anyone. Each day has its own URL and its
// own share image, so a post that links to a day keeps its preview.
//
//   loading            the heading (the track is known from the date) and a
//                      skeleton with a status line
//   not yet / no day   a future date or one before the first question: a line
//                      and a link to today's question
//   expired            the sealed session is over an hour old: load it again
//   offline / failed   an alert with Try again
//   ready              the question, its options and Check answer
//   checked            correct or not in words and colour, the right option
//                      marked, the explanation, practice more and share
import { useId, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { useT } from '../i18n/LanguageContext';
import { categoryLabelKey } from '../lib/categories';
import { checkDailyAnswer, dailyQuestionQuery, qotdProblem, type QotdProblem, type QotdResult } from '../lib/dailyQuestion';
import { CURRENT_PRODUCT } from '../lib/products';
import { captureShare, canWebShare, copyText, shareLink } from '../lib/share';
import { addDays, isIsoDate, qotdAvailability, qotdPath, qotdTrack, utcToday, type QotdResponse } from '../../../shared/daily-question';
import type { CategoryType } from '../types/quiz';
import { renderQuestion } from './CodeBlock';
import { CategoryTag } from './ui/CategoryTag';
import { RadioCard, RadioCardGroup } from './ui/RadioCards';
import BrandCase from './BrandCase';
import './DailyQuestion.css';

const longDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

type ShareStatus = 'idle' | 'shared' | 'copied' | 'failed';

export default function DailyQuestionPage() {
  const t = useT();
  const { date: dateParam } = useParams<{ date?: string }>();
  const today = utcToday();
  const date = dateParam ?? today;
  const valid = isIsoDate(date);
  const availability = valid ? qotdAvailability(date, today) : 'before-start';
  const query = useQuery({ ...dailyQuestionQuery(dateParam ?? 'today'), enabled: valid && availability === 'open' });
  // "Load it again" after a claimed or expired session starts the question
  // over once the fresh session is here. Counted rather than left to the
  // session id, so the expired banner cannot outlive a reload.
  const [reloads, setReloads] = useState(0);
  const reload = async () => {
    await query.refetch();
    setReloads((count) => count + 1);
  };

  const shownDate = query.data?.date ?? date;
  const track = query.data?.track ?? (valid ? qotdTrack(date) : null);
  const trackName = track ? t(categoryLabelKey(track)) : '';

  return (
    <article className="ss-info-page ss-daily" aria-busy={query.isFetching || undefined}>
      <header className="ss-info-page__header">
        <span className="ss-info-page__kicker"><BrandCase text={t('daily.kicker')} /></span>
        <h1>{track ? t('daily.title', { track: trackName }) : t('daily.titlePlain')}</h1>
        {valid && <p className="ss-daily__date"><time dateTime={shownDate}>{longDate(shownDate)}</time></p>}
        <p>{t('daily.lead')}</p>
      </header>

      {availability !== 'open' ? (
        <Unavailable problem={availability === 'not-yet' ? 'not-yet' : 'before-start'} date={valid ? date : null} />
      ) : query.isPending ? (
        <section className="ss-info-card ss-daily__card" aria-label={t('daily.loading')}>
          <span role="status" className="ss-daily__sr">{t('daily.loading')}</span>
          <Skeleton width={120} height={22} radius={2} />
          <Skeleton width="100%" height={18} radius={2} />
          <Skeleton width="80%" height={18} radius={2} />
          {[0, 1, 2, 3].map((one) => <Skeleton key={one} width="100%" height={48} radius={2} />)}
        </section>
      ) : query.isError ? (
        <Unavailable problem={qotdProblem(query.error)} date={date} onRetry={() => void query.refetch()} />
      ) : (
        <DailyQuestion key={`${query.data.sessionId}:${reloads}`} data={query.data} onReload={() => void reload()} />
      )}

      {valid && (
        <p className="ss-daily__next">
          {t('daily.next', { track: t(categoryLabelKey(qotdTrack(addDays(shownDate, 1)))) })}
        </p>
      )}
    </article>
  );
}

function Unavailable({ problem, date, onRetry }: { problem: QotdProblem; date: string | null; onRetry?: () => void }) {
  const t = useT();
  const toToday = <Button variant="secondary" as={Link} href={qotdPath()} label={t('daily.toToday')} />;
  switch (problem) {
    case 'not-yet':
      return (
        <section className="ss-info-card ss-daily__card">
          <p>{t('daily.notYet', { date: date ? longDate(date) : '' })}</p>
          <div className="ss-info-actions">{toToday}</div>
        </section>
      );
    case 'before-start':
      return (
        <section className="ss-info-card ss-daily__card">
          <p>{t('daily.noQuestion')}</p>
          <div className="ss-info-actions">{toToday}</div>
        </section>
      );
    case 'expired':
      return (
        <section className="ss-info-card ss-daily__card">
          <Banner status="info" title={t('daily.expired')} />
          <div className="ss-info-actions"><Button variant="primary" label={t('daily.reload')} onClick={onRetry} /></div>
        </section>
      );
    default:
      return (
        <section className="ss-info-card ss-daily__card">
          <div role="alert">
            <Banner status="error" title={t(problem === 'offline' ? 'daily.offline' : 'daily.failed')} />
          </div>
          <div className="ss-info-actions"><Button variant="primary" label={t('quiz.retry')} onClick={onRetry} /></div>
        </section>
      );
  }
}

function DailyQuestion({ data, onReload }: { data: QotdResponse; onReload: () => void }) {
  const t = useT();
  const questionId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<QotdResult | null>(null);
  const [problem, setProblem] = useState<QotdProblem | null>(null);
  const [share, setShare] = useState<ShareStatus>('idle');
  const { question, track, date } = data;
  const trackName = t(categoryLabelKey(track));
  const url = useMemo(() => `${window.location.origin}${qotdPath(date)}`, [date]);

  const check = async () => {
    if (selected === null || checking || result) return;
    setChecking(true);
    setProblem(null);
    try {
      setResult(await checkDailyAnswer(data.sessionId, question.id, selected));
    } catch (error) {
      setProblem(qotdProblem(error));
    } finally {
      setChecking(false);
    }
  };

  const onShare = async () => {
    const text = t('daily.shareText', { track: trackName });
    if (canWebShare()) {
      captureShare('daily_question', 'daily', 'share');
      const outcome = await shareLink({ title: CURRENT_PRODUCT.brand, text, url });
      if (outcome !== 'cancelled') setShare(outcome);
      return;
    }
    captureShare('daily_question', 'daily', 'copy');
    setShare((await copyText(url)) ? 'copied' : 'failed');
  };

  if (problem === 'expired') return <Unavailable problem="expired" date={date} onRetry={onReload} />;

  return (
    <section className="ss-info-card ss-daily__card" aria-labelledby={questionId}>
      <div className="ss-daily__meta">
        <CategoryTag category={question.category as CategoryType} />
        <Badge variant="neutral" label={t('challenge.difficultyLevel', { level: question.difficulty })} />
      </div>
      <div id={questionId} className="ss-daily__question">{renderQuestion(question.question)}</div>

      <RadioCardGroup value={selected} onChange={(value) => { if (!result) setSelected(Number(value)); }} labelledBy={questionId}>
        <div className="ss-daily__options">
          {question.options.map((option, index) => {
            const isCorrect = !!result && index === result.correctAnswer;
            const isWrongPick = !!result && !result.isCorrect && index === result.selectedIndex;
            return (
              <RadioCard
                key={index}
                value={index}
                index={index}
                label={isCorrect ? `${option}, ${t('daily.correctOption')}` : isWrongPick ? `${option}, ${t('daily.yourPick')}` : option}
                disabled={!!result || checking}
                tone={isCorrect ? 'success' : 'default'}
                padding={2}
                className={isWrongPick ? 'ss-daily__option--wrong' : undefined}
              >
                <span className="ss-daily__option">
                  <span className="ss-daily__option-key" aria-hidden>{index + 1}</span>
                  <span>{option}</span>
                  {isCorrect && <span className="ss-daily__option-mark">{t('daily.correctOption')}</span>}
                  {isWrongPick && <span className="ss-daily__option-mark">{t('daily.yourPick')}</span>}
                </span>
              </RadioCard>
            );
          })}
        </div>
      </RadioCardGroup>

      {problem && (
        <div role="alert">
          <Banner status="error" title={t(problem === 'offline' ? 'daily.offline' : 'daily.checkFailed')} />
        </div>
      )}

      {result ? (
        <div className="ss-daily__result" aria-live="polite">
          <Banner
            status={result.isCorrect ? 'success' : 'error'}
            title={result.isCorrect ? t('daily.right') : t('daily.wrong')}
            description={result.explanation || undefined}
          />
          <div className="ss-info-actions">
            <Button variant="primary" as={Link} href={`/quiz?category=${encodeURIComponent(track)}`} label={t('daily.practice', { track: trackName })} />
            <Button variant="secondary" label={t('daily.share')} onClick={() => void onShare()} />
          </div>
          <p className="ss-daily__status" role="status">
            {share === 'shared' ? t('daily.shared') : share === 'copied' ? t('daily.copied') : share === 'failed' ? t('daily.copyFailed', { url }) : ''}
          </p>
          <p className="ss-daily__note">{t('daily.practiceNote')}</p>
        </div>
      ) : (
        <div className="ss-info-actions">
          <Button
            variant="primary"
            label={t('daily.check')}
            onClick={() => void check()}
            isDisabled={selected === null || checking}
            isLoading={checking}
          />
        </div>
      )}
    </section>
  );
}
