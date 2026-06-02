/**
 * NotFound — 404 페이지
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-6xl font-bold text-[var(--text-muted)]">404</p>
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t('notFound.title')}</h1>
      <Button asChild variant="primary">
        <Link to="/">{t('notFound.backHome')}</Link>
      </Button>
    </div>
  );
}
