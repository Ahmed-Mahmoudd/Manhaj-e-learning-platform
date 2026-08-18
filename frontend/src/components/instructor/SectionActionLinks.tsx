import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/LocaleContext';

export function SectionActionLinks({ sectionId }: { sectionId: number }) {
  const { t } = useLocale();
  const base = `/instructor/sections/${sectionId}`;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <Link to={base} className="text-sm text-brass transition hover:text-brass-hover">
        {t('viewRoster')} →
      </Link>
      <Link to={`${base}/grades`} className="text-sm text-brass transition hover:text-brass-hover">
        {t('manageGrades')} →
      </Link>
      <Link
        to={`${base}/announcements`}
        className="text-sm text-brass transition hover:text-brass-hover"
      >
        {t('manageAnnouncements')} →
      </Link>
      <Link to={`${base}/discuss`} className="text-sm text-brass transition hover:text-brass-hover">
        {t('moderateDiscussion')} →
      </Link>
      <Link
        to={`${base}/analytics`}
        className="text-sm text-brass transition hover:text-brass-hover"
      >
        {t('sectionAnalytics')} →
      </Link>
    </div>
  );
}
