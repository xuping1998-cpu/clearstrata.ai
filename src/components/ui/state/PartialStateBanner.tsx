import type { PartialFailure } from '@/lib/ui/pageStateModel';
import { stateText } from '@/lib/ui/pageStateModel';
import { WarningState } from '@/components/ui/state/WarningState';

export type PartialStateBannerProps = {
  langEn: boolean;
  failures: PartialFailure[];
  className?: string;
};

export function PartialStateBanner({ langEn, failures, className }: PartialStateBannerProps) {
  if (!failures.length) return null;

  const title =
    failures.length === 1
      ? stateText(failures[0]!.message, langEn)
      : langEn
        ? 'Some information could not be loaded'
        : '部分信息暂时无法加载';

  const description =
    failures.length === 1
      ? undefined
      : failures.map((f) => stateText(f.message, langEn)).join(' · ');

  return (
    <WarningState
      langEn={langEn}
      title={title}
      description={description}
      compact
      className={className}
    />
  );
}
