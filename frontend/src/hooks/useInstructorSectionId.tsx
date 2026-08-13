import { useParams } from 'react-router-dom';
import { useLocale } from '@/i18n/LocaleContext';
import { parseRouteId } from '@/utils/routeParams';
import { InvalidParamState } from '@/components/InvalidParamState';

/** Guard for /instructor/sections/:sectionId/* routes with invalid IDs. */
export function useInstructorSectionId(): number | null {
  const { sectionId } = useParams<{ sectionId: string }>();
  return parseRouteId(sectionId);
}

export function InstructorInvalidSection() {
  const { t } = useLocale();
  return (
    <InvalidParamState
      message={t('invalidSectionId')}
      backTo="/instructor"
      backLabel={t('backToInstructorSections')}
    />
  );
}
