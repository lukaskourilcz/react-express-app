// /changelog (#239): dated notes on what changed, linked from the footer. The
// entries live in lib/changelog.ts; the build writes the same article into
// the page's static HTML.
import { Link } from 'react-router-dom';
import { useT } from '../i18n/LanguageContext';
import { ChangelogArticle } from './ChangelogArticle';
import './Changelog.css';

export default function ChangelogPage() {
  const t = useT();
  return <ChangelogArticle t={t} link={(to, label) => <Link to={to}>{label}</Link>} />;
}
