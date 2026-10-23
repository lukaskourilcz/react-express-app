import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { LearnPageHeader } from './learn/LearnPageHeader';
import './BigOPage.css';

const curves = [
  { label: 'O(1)', color: 'var(--ss-success-strong)', growth: (_n: number) => 1 },
  { label: 'O(log n)', color: 'var(--ss-chart-blue)', growth: (n: number) => Math.log2(n) },
  { label: 'O(n)', color: 'var(--color-text-primary)', growth: (n: number) => n },
  { label: 'O(n log n)', color: 'var(--ss-chart-gold)', growth: (n: number) => n * Math.log2(n) },
  { label: 'O(n²)', color: 'var(--ss-error-text)', growth: (n: number) => n * n },
];

export default function BigOPage() {
  const { t } = useLanguage();
  // The Learn page header (UX audit learn-15); the route shell sets the 800px
  // column.
  return <article className="de-page bo-page">
    <LearnPageHeader title={t('bigO.title')} lead={t('bigO.lead')} />
    <section className="ss-info-card">
      <h2>{t('bigO.inputTitle')}</h2>
      <p>{t('bigO.inputBody')}</p>
      <p>{t('bigO.growthBody')}</p>
      <figure className="bo-chart">
        <svg viewBox="0 0 520 290" role="img" aria-labelledby="bo-chart-title bo-chart-desc">
          <title id="bo-chart-title">{t('bigO.chartTitle')}</title>
          <desc id="bo-chart-desc">{t('bigO.chartDescription')}</desc>
          <path d="M50 15V245H495" fill="none" stroke="currentColor" />
          {[4, 8, 12, 16].map((n) => <g key={n}><path d={`M${50 + (n - 1) * 28} 15V245`} className="bo-grid" /><text x={50 + (n - 1) * 28} y="263" textAnchor="middle">{n}</text></g>)}
          {[0, 64, 128, 192, 256].map((count) => <text key={count} x="42" y={249 - count * .85} textAnchor="end">{count}</text>)}
          {curves.map((curve, index) => <polyline key={curve.label} fill="none" stroke={curve.color} strokeWidth="3"
            strokeDasharray={index === 0 ? '4 3' : index === 1 ? '10 3' : undefined}
            points={Array.from({ length: 61 }, (_, i) => { const n = 1 + i / 4; return `${50 + (n - 1) * 28},${245 - curve.growth(n) * .85}`; }).join(' ')} />)}
          <text x="275" y="285" textAnchor="middle">{t('bigO.inputAxis')}</text>
        </svg>
        <figcaption>{t('bigO.chartCaption')}</figcaption>
      </figure>
      <div className="bo-table-wrap" role="region" tabIndex={0} aria-labelledby="bo-examples-title" onKeyDown={event => {
        if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        event.currentTarget.scrollLeft += (event.key === 'ArrowRight' ? 1 : -1) * Math.max(80, event.currentTarget.clientWidth / 2);
      }}><table className="bo-table">
        <caption id="bo-examples-title">{t('bigO.examplesTitle')}</caption>
        <thead><tr><th>{t('bigO.notation')}</th><th>{t('bigO.example')}</th><th>n = 10</th><th>n = 100</th></tr></thead>
        <tbody>{curves.map((curve, i) => <tr key={curve.label}><th scope="row"><span style={{ color: curve.color }}>{curve.label}</span></th><td>{t((['bigO.constant', 'bigO.logarithmic', 'bigO.linear', 'bigO.sorting', 'bigO.quadratic'] as const)[i])}</td><td>{Math.round(curve.growth(10))}</td><td>{Math.round(curve.growth(100))}</td></tr>)}</tbody>
      </table></div>
      <p>{t('bigO.simplify')}</p>
    </section>
    <section className="ss-info-card"><h2>{t('bigO.practiceTitle')}</h2><p>{t('bigO.pathLead')}</p><Link className="bo-cta" to="/learn/big-o">{t('bigO.practiceLink')}</Link></section>
  </article>;
}
