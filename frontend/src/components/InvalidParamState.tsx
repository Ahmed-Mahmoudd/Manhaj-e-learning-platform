import { BackLink } from '@/components/BackLink';

export function InvalidParamState({
  message,
  backTo,
  backLabel,
}: {
  message: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <div className="space-y-4">
      <BackLink to={backTo}>{backLabel}</BackLink>
      <div className="border border-brick/30 bg-brick/5 px-6 py-8" role="alert">
        <p className="text-sm text-brick">{message}</p>
      </div>
    </div>
  );
}
