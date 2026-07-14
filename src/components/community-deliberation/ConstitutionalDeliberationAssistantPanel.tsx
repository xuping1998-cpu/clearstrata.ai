import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, lifecycleOutlineButtonClass } from '@/components/ui/Button';
import { SkeletonLine } from '@/components/ui/state/SkeletonBlocks';
import { ContextualEmptyState } from '@/components/ui/state';
import type { GovernanceMatterCategory } from '@/lib/community/governanceMatterModel';
import {
  constitutionalBasisForCategory,
  formatConstitutionalPrinciple,
  type ConstitutionalPrincipleRef,
} from '@/lib/community/constitutionalBasis';
import type { CdaReportContent, GovernanceMatterCdaReportRow } from '@/lib/community/cdaReportModel';

export type ConstitutionalDeliberationAssistantPanelProps = {
  langEn: boolean;
  category: GovernanceMatterCategory;
  report: GovernanceMatterCdaReportRow | null;
  loading: boolean;
  generating: boolean;
  canRequestAnalysis: boolean;
  onRequestAnalysis?: () => void;
  /** When true, panel is rendered inside a tab (no outer top margin). */
  embedded?: boolean;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-indigo-100 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-bold uppercase tracking-wide text-indigo-800">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ViewpointList({
  items,
  langEn,
  emptyLabel,
}: {
  items: CdaReportContent['major_viewpoints'];
  langEn: boolean;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((v, i) => (
        <li key={i} className="rounded-lg bg-white/70 px-3 py-2 text-sm text-gray-800">
          <p className="font-semibold text-gray-900">{langEn ? v.label_en : v.label_zh || v.label_en}</p>
          <p className="mt-0.5 text-gray-700">{langEn ? v.summary_en : v.summary_zh || v.summary_en}</p>
        </li>
      ))}
    </ul>
  );
}

function TextItemList({
  items,
  langEn,
  emptyLabel,
}: {
  items: { text_en: string; text_zh: string }[];
  langEn: boolean;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
      {items.map((item, i) => (
        <li key={i}>{langEn ? item.text_en : item.text_zh || item.text_en}</li>
      ))}
    </ul>
  );
}

function BasisList({ basis, langEn }: { basis: ConstitutionalPrincipleRef[]; langEn: boolean }) {
  return (
    <ul className="space-y-1.5">
      {basis.map((ref, i) => (
        <li key={i} className="text-sm font-medium text-indigo-950">
          {formatConstitutionalPrinciple(ref, langEn)}
        </li>
      ))}
    </ul>
  );
}

export function ConstitutionalDeliberationAssistantPanel({
  langEn,
  category,
  report,
  loading,
  generating,
  canRequestAnalysis,
  onRequestAnalysis,
  embedded = false,
}: ConstitutionalDeliberationAssistantPanelProps) {
  const en = langEn;
  const basis = report?.constitutional_basis?.length
    ? report.constitutional_basis
    : constitutionalBasisForCategory(category);
  const content = report?.content ?? null;
  const principlesReviewed = report?.principles_reviewed ?? [];

  return (
    <section
      className={
        embedded
          ? 'rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white p-4'
          : 'mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-white p-5 shadow-sm'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden />
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {en ? 'Constitutional Deliberation Assistant' : '宪章议事助手'}
            </h2>
            <p className="mt-0.5 text-xs text-indigo-800/90">
              {en
                ? 'AI assists deliberation. People decide.'
                : 'AI 协助议事。决策权在人。'}
            </p>
          </div>
        </div>
        {canRequestAnalysis ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={lifecycleOutlineButtonClass('cda')}
            loading={generating}
            onClick={onRequestAnalysis}
          >
            {generating
              ? en
                ? 'Analyzing…'
                : '分析中…'
              : report
                ? en
                  ? 'Refresh analysis'
                  : '刷新分析'
                : en
                  ? 'Generate CDA Report'
                  : '生成 CDA 报告'}
          </Button>
        ) : null}
      </div>

      <div className="mt-4 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <Section title={en ? 'Constitutional Basis' : '宪章依据'}>
          <BasisList basis={basis} langEn={en} />
        </Section>

        {loading ? (
          <div className="space-y-2" aria-hidden>
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonLine className="h-4 w-1/2" />
            <SkeletonLine className="h-20 w-full" />
          </div>
        ) : content ? (
          <>
            {content.consensus_percent != null ? (
              <Section title={en ? 'Current Consensus' : '当前共识'}>
                <p className="text-2xl font-bold text-indigo-900">{content.consensus_percent}%</p>
                {(en ? content.consensus_summary_en : content.consensus_summary_zh || content.consensus_summary_en) ? (
                  <p className="mt-1 text-sm text-gray-700">
                    {en ? content.consensus_summary_en : content.consensus_summary_zh || content.consensus_summary_en}
                  </p>
                ) : null}
              </Section>
            ) : null}

            <Section title={en ? 'Major Viewpoints' : '主要观点'}>
              <ViewpointList
                items={content.major_viewpoints}
                langEn={en}
                emptyLabel={en ? 'No major viewpoints identified yet.' : '尚未识别主要观点。'}
              />
            </Section>

            <Section title={en ? 'Minority Opinions' : '少数意见'}>
              <ViewpointList
                items={content.minority_opinions}
                langEn={en}
                emptyLabel={en ? 'No minority opinions identified.' : '未识别少数意见。'}
              />
            </Section>

            <Section title={en ? 'Potential Risks' : '潜在风险'}>
              <TextItemList
                items={content.potential_risks}
                langEn={en}
                emptyLabel={en ? 'No risks flagged.' : '未标记风险。'}
              />
            </Section>

            <Section title={en ? 'Missing Information' : '缺失信息'}>
              <TextItemList
                items={content.missing_information}
                langEn={en}
                emptyLabel={en ? 'No gaps identified.' : '未识别信息缺口。'}
              />
            </Section>

            {(en ? content.suggested_resolution_en : content.suggested_resolution_zh || content.suggested_resolution_en) ? (
              <Section title={en ? 'Suggested Resolution (Draft)' : '建议决议（草案）'}>
                <p className="whitespace-pre-wrap text-sm text-gray-800">
                  {en
                    ? content.suggested_resolution_en
                    : content.suggested_resolution_zh || content.suggested_resolution_en}
                </p>
                <p className="mt-2 text-[11px] text-amber-800">
                  {en
                    ? 'Draft only — council must review and decide.'
                    : '仅为草案 — 业委会须审议并决策。'}
                </p>
              </Section>
            ) : null}

            {(en ? content.suggested_next_step_en : content.suggested_next_step_zh || content.suggested_next_step_en) ? (
              <Section title={en ? 'Suggested Next Step' : '建议下一步'}>
                <p className="text-sm text-gray-800">
                  {en
                    ? content.suggested_next_step_en
                    : content.suggested_next_step_zh || content.suggested_next_step_en}
                </p>
              </Section>
            ) : null}

            {principlesReviewed.length > 0 ? (
              <Section title={en ? 'Constitutional Principles Reviewed' : '已审议宪章原则'}>
                <BasisList basis={principlesReviewed} langEn={en} />
              </Section>
            ) : null}
          </>
        ) : (
          <ContextualEmptyState
            langEn={en}
            contentKey={canRequestAnalysis ? 'governance.noCda' : 'governance.noCdaOwner'}
            canCouncil={canRequestAnalysis}
            compact
            hideIcon
            actionOverride={
              canRequestAnalysis && onRequestAnalysis
                ? {
                    label: { en: 'Generate CDA Report', zh: '生成 CDA 报告' },
                    onClick: onRequestAnalysis,
                  }
                : undefined
            }
          />
        )}
      </div>

      <footer className="mt-4 space-y-1 border-t border-indigo-100 pt-3 text-[11px] text-indigo-900/80">
        <p className="font-semibold">
          {en ? 'Prepared by Constitutional Deliberation Assistant' : '由宪章议事助手编制'}
        </p>
        <p>
          {en
            ? 'Generated by AI · Reviewed by Community · Decision by People'
            : 'AI 生成 · 社区审阅 · 人做决定'}
        </p>
        {report?.created_at ? (
          <p className="text-gray-500">
            {en ? 'Last generated' : '最近生成'}: {new Date(report.created_at).toLocaleString()}
          </p>
        ) : null}
      </footer>
    </section>
  );
}
