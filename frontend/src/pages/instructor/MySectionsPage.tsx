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
        <div className="space-y-4">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} locale={locale} />
          ))}
        </div>
      </AsyncPanel>
    </div>
  );
}

function SectionCard({
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
    <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-xs transition-all hover:border-brass/40 hover:shadow-sm space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-ink">{section.course.code}</span>
            <span className="rounded bg-paper px-2 py-0.5 font-mono text-xs text-ink/50">
              §{section.section_number}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-ink">{title}</h2>

          <div className="flex flex-wrap gap-2 pt-1">
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
            <p className="font-mono text-xs text-ink/50 pt-1">🗓️ {scheduleText}</p>
          )}
        </div>

        <div className="shrink-0 pt-1">
          <SectionActionLinks sectionId={section.id} />
        </div>
      </div>

      <div className="pt-2 border-t border-ink/5">
        <TermLedger
          variant="inline"
          startsAt={section.term.starts_at}
          endsAt={section.term.ends_at}
          label={section.term.name}
        />
      </div>
    </div>
  );
}
