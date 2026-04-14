import { useNavigate } from 'react-router-dom';

export function WelcomeAfterJoinPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-gray-900 text-center mb-4 max-w-lg">你已进入你的物业</h1>
      <p className="mb-8 text-gray-600 text-center max-w-md">现在开始掌控每一笔支出</p>
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="rounded-xl bg-[#1D9E75] text-white px-8 py-3 text-sm font-semibold shadow-sm hover:bg-[#178a66] transition-colors"
      >
        查看全部支出
      </button>
    </div>
  );
}
