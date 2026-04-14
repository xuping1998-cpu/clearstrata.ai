import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InviteQRCode } from '@/components/InviteQRCode';

/**
 * 楼内 / 业主群成交版海报页。扫码进入 `/join/:code`，页内可分流演示或真实入楼。
 * 竖版打印：浏览器打印本页（Ctrl+P），建议选「纵向」、关闭页眉页脚。
 */
export function PosterLandingPage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw?.trim() ?? '';

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/join/${encodeURIComponent(code)}`;
  }, [code]);

  if (!code) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 text-center text-gray-700">
        <p>缺少邀请码路径。请使用 /marketing/poster/<strong>你的公开邀请码</strong></p>
        <Link className="mt-4 inline-block text-[#1D9E75] underline" to="/">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #poster-print-root, #poster-print-root * { visibility: visible; }
          #poster-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
        <div className="mx-auto max-w-lg px-4 print:max-w-none">
          <p className="mb-4 text-center text-sm text-gray-500 print:hidden">
            打印提示：按 Ctrl+P，选纵向；下方为可打印竖版区域。
          </p>

          <div
            id="poster-print-root"
            className="mx-auto flex min-h-[720px] max-w-md flex-col rounded-3xl border border-gray-200 bg-white p-8 shadow-xl print:min-h-screen print:max-w-none print:rounded-none print:border-0 print:shadow-none"
          >
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#1D9E75]">ClearStrata</p>
              <h1 className="mt-6 text-3xl font-black leading-tight text-gray-900 print:text-4xl">
                你的物业，可能多花了15%
              </h1>
              <p className="mt-4 text-lg text-gray-600 print:text-xl">扫码查看你家每一笔支出</p>
              <p className="mt-3 text-sm text-gray-500">支持先看演示，再查看本楼真实数据</p>
            </div>

            <div className="mt-10 flex flex-1 flex-col items-center justify-center py-6">
              {joinUrl ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 print:border-gray-300">
                  <InviteQRCode
                    value={joinUrl}
                    size={240}
                    title="扫码进入"
                    purpose="业主可先体验演示楼，再输入房号查看真实费用"
                    label={`邀请码：${code}`}
                    downloadFileName={`clearstrata-poster-${code}.png`}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-auto border-t border-gray-100 pt-6 text-center text-xs leading-relaxed text-gray-500">
              <p>扫码后请选择：</p>
              <p className="mt-1 font-medium text-gray-700">「我是本楼业主」或「我先看看系统」</p>
              <p className="mt-4 break-all text-[10px] text-gray-400">{joinUrl}</p>
            </div>
          </div>

          <div className="mt-8 text-center print:hidden">
            <Link to={`/join/${encodeURIComponent(code)}`} className="text-sm font-medium text-[#1D9E75] underline">
              预览扫码落地页
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
