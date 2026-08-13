import { useQuery } from '@tanstack/react-query';
import { discussionKeys, fetchSectionThreads } from '@/api/discussion';
import {
  fetchSectionAnnouncements,
  fetchSectionGradeItems,
  fetchInstructorSections,
  instructorKeys,
} from '@/api/instructor';
import { AsyncPanel } from '@/components/AsyncPanel';
import { SectionActionLinks } from '@/components/instructor/SectionActionLinks';
import { StatChip } from '@/components/StatChip';
import { TermLedger } from '@/components/TermLedger';
import { useLocale } from '@/i18n/LocaleContext';
import type { InstructorSection } from '@/types/instructor';

function sectionTitle(section: InstructorSection, locale: 'en' | 'ar'): string {
  if (locale === 'ar' && section.course.title_ar) return section.course.title_ar;
  return section.course.title_en;
}

function formatSchedule(
  schedule: InstructorSection['schedule'],
): string | null {
  if (!schedule?.length) return null;
  return schedule.map((s) => `${s.day} ${s.time} · ${s.room}`).join(' · ');
}

export function MySectionsPage() {
  const { t, locale } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: instructorKeys.sections(),
    queryFn: fetchInstructorSections,
  });

  const sections = data?.sections ?? [];
  const primaryTerm = sections[0]?.term;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-ink">{t('instructorSections')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('instructorSectionsSubtitle')}</p>
      </header>

      {primaryTerm && (
        <TermLedger
          variant="page"
          startsAt={primaryTerm.starts_at}
          endsAt={primaryTerm.ends_at}
          label={primaryTerm.name}
        />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && sections.length === 0}
        emptyMessage={t('noInstructorSections')}
      >
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {sections.map((section) => (
            <SectionRow key={section.id} section={section} locale={locale} />
          ))}
        </ul>
      </AsyncPanel>
    </div>
  );
}

function SectionRow({
  section,
  locale,
}: {
  section: InstructorSection;
  locale: 'en' | 'ar';
}) {
  const { t } = useLocale();
  const title = sectionTitle(section, locale);
  const scheduleText = formatSchedule(section.schedule);

  const gradeItemsQuery = useQuery({
    queryKey: instructorKeys.gradeItems(section.id),
    queryFn: () => fetchSectionGradeItems(section.id),
  });
  const announcementsQuery = useQuery({
    queryKey: instructorKeys.announcements(section.id),
    queryFn: () => fetchSectionAnnouncements(section.id),
  });
  const threadsQuery = useQuery({
    queryKey: discussionKeys.threads(section.id, 1),
    queryFn: () => fetchSectionThreads(section.id, 1),
  });

  const gradeItemCount = gradeItemsQuery.isLoading ? null : (gradeItemsQuery.data?.grade_items.length ?? 0);
  const draftCount = announcementsQuery.isLoading
    ? null
    : (announcementsQuery.data?.announcements.filter((a) => !a.is_published).length ?? 0);
  const threadCount = threadsQuery.isLoading ? null : (threadsQuery.data?.meta.total ?? 0);

  return (
    <li className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-sm font-medium text-ink">{section.course.code}</span>
            <span className="text-xs text-ink/40">§{section.section_number}</span>
          </div>
          <h2 className="mt-1 text-base font-medium text-ink">{title}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatChip variant="sage">
              {t('sectionStatEnrolled', { count: section.enrolled_count })}
            </StatChip>
            {gradeItemCount != null && (
              <StatChip>{t('sectionStatGradeItems', { count: gradeItemCount })}</StatChip>
            )}
            {threadCount != null && (
              <StatChip>{t('sectionStatThreads', { count: threadCount })}</StatChip>
            )}
            {draftCount != null && draftCount > 0 && (
              <StatChip variant="brick">
                {t('sectionStatDrafts', { count: draftCount })}
              </StatChip>
            )}
          </div>
          {scheduleText && (
            <p className="mt-2 font-mono text-xs text-ink/45">{scheduleText}</p>
          )}
        </div>
        <SectionActionLinks sectionId={section.id} />
      </div>
      <div className="mt-3">
        <TermLedger
          variant="inline"
          startsAt={section.term.starts_at}
          endsAt={section.term.ends_at}
          label={section.term.name}
        />
      </div>
    </li>
  );
}
