import { useNavigate } from 'react-router-dom';
import {
  demoUnitDraftKey,
  getStoredDemoInviteCode,
  resolveJoinPrefillUnit,
} from '@/lib/demoProperty/demoStorage';

/** 演示楼 → 真实入楼（转化） */
export function DemoPropertyConvertBar() {
  const navigate = useNavigate();
  const invite = getStoredDemoInviteCode();

  const goReal = () => {
    if (!invite) return;
    const fresh =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(demoUnitDraftKey(invite))?.trim() ?? ''
        : '';
    const unit = resolveJoinPrefillUnit(invite, fresh || undefined);
    const q = new URLSearchParams();
    q.set('from', 'demo');
    q.set('unit', unit);
    navigate(`/join/${encodeURIComponent(invite)}?${q.toString()}`);
  };

  if (!invite) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950">
        <p className="font-semibold">想知道自家是不是也在多花钱？</p>
        <p className="mt-1 text-xs text-amber-900/90">
          请从业委会海报或链接进入本楼邀请页，选择「我先看看系统」后，这里会出现一键对比真实支出的入口。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 px-4 py-5 shadow-md">
      <button
        type="button"
        onClick={goReal}
        className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 py-3.5 text-base font-extrabold text-white shadow-lg shadow-rose-500/30 transition hover:from-rose-500 hover:to-orange-500 hover:shadow-xl hover:shadow-rose-500/25 active:scale-[0.99]"
      >
        🔥 我家是不是多花钱了？
      </button>
      <p className="mt-2.5 text-center text-sm font-medium text-gray-800">
        输入房号，查看你所在楼的真实费用数据
      </p>
      <p className="mt-1 text-center text-xs text-gray-500">已为你预填房号草稿，可在入楼页直接修改</p>
    </div>
  );
}
