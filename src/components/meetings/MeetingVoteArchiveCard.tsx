import { useState } from 'react';
import { FileText, X } from 'lucide-react';
import { MEETING_VOTE_ARCHIVE_GUIDE_ZH } from '@/components/meetings/meetingVoteArchiveConstants';

type Props = {
  languageEn: boolean;
};

export function MeetingVoteArchiveCard({ languageEn }: Props) {
  const [guideOpen, setGuideOpen] = useState(false);
  const g = MEETING_VOTE_ARCHIVE_GUIDE_ZH;

  const placeholders: { id: string; zh: string; en: string }[] = [
    { id: '01', zh: '正式会议通知', en: 'Formal notice' },
    { id: '02', zh: '支持文件', en: 'Supporting documents' },
    { id: '03', zh: '讨论记录', en: 'Discussion archive' },
    { id: '04', zh: '投票记录', en: 'Voting record' },
    { id: '05', zh: '决议结果', en: 'Resolution report' },
    { id: '06', zh: '会议纪要', en: 'Minutes' },
  ];

  return (
    <>
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-2">
          <FileText className="size-4 shrink-0 text-slate-600" aria-hidden />
          <h3 className="text-base font-semibold text-gray-900">{languageEn ? 'Meeting archive' : '会议档案'}</h3>
          <span className="rounded bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
            {languageEn ? 'Fixed folders' : '固定目录'}
          </span>
        </div>

        <ul className="space-y-2">
          <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200/70 bg-white/90 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-xs font-semibold text-emerald-800">00</span>
              <span className="font-medium text-gray-900">{languageEn ? 'Guide' : '使用说明'}</span>
              <span className="shrink-0 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-px text-[10px] font-semibold uppercase text-emerald-900">
                {languageEn ? 'Read-only' : '只读'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="shrink-0 rounded-lg border border-emerald-600 bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {languageEn ? 'View' : '查看'}
            </button>
          </li>

          {placeholders.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 bg-white/80 px-3 py-2 text-gray-500"
            >
              <span className="font-medium text-gray-700">
                <span className="mr-2 font-mono text-xs">{row.id}</span>
                {languageEn ? row.en : row.zh}
              </span>
              <span className="text-xs">{languageEn ? 'Pending · No file yet' : '待生成 · 暂无文件'}</span>
            </li>
          ))}
        </ul>
      </div>

      {guideOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-vote-archive-guide-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setGuideOpen(false);
          }}
        >
          <div
            className="max-h-[min(92vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <h2 id="meeting-vote-archive-guide-title" className="text-base font-semibold text-gray-900">
                  {g.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{g.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
                aria-label={languageEn ? 'Close' : '关闭'}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[min(78vh,600px)] space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-800">
              {languageEn ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  Reference text below is maintained in Chinese (counsel-draft). UI labels follow your language
                  setting.
                </p>
              ) : null}

              <p>{g.intro}</p>
              <p className="font-medium">{g.platformSupportsLabel}</p>
              <ul className="list-disc space-y-1 pl-5">
                {g.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>

              <h3 className="text-[13px] font-semibold text-gray-900">{g.governanceTitle}</h3>
              {g.principles.map((p) => (
                <div key={p.num}>
                  <p className="font-medium text-gray-900">
                    {p.num}. {p.heading}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap pl-3 text-gray-800">{p.body}</p>
                </div>
              ))}

              <h3 className="text-[13px] font-semibold text-gray-900">{g.flowTitle}</h3>
              <ol className="list-decimal space-y-1 pl-5">
                {g.flowSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <h3 className="text-[13px] font-semibold text-gray-900">{g.dirTitle}</h3>
              <ul className="space-y-0.5 font-mono text-xs text-gray-800">
                {g.dirLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <h3 className="text-[13px] font-semibold text-gray-900">{g.pledgeTitle}</h3>
              <ul className="space-y-1">
                {g.pledges.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200/60"
              >
                {languageEn ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
