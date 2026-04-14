import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function JoinScanMarketingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const unit = useMemo(() => searchParams.get('unit') ?? '', [searchParams]);

  const goBind = () => {
    const q = new URLSearchParams();
    if (unit.trim()) q.set('unit', unit.trim());
    navigate(`/bind-unit?${q.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-4 max-w-lg">你的物业，可能多花了15%</h1>
      <p className="mb-8 text-gray-600 text-center max-w-md">扫码查看你家每一笔支出</p>
      <button
        type="button"
        onClick={goBind}
        className="rounded-xl bg-[#1D9E75] text-white px-8 py-3 text-sm font-semibold shadow-sm hover:bg-[#178a66] transition-colors"
      >
        立即查看
      </button>
    </div>
  );
}
