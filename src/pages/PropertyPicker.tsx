import { Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProperty } from '../contexts/PropertyContext';

export function PropertyPicker() {
  const navigate = useNavigate();
  const { memberships, setCurrentPropertyId } = useProperty();

  const choose = (propertyId: string) => {
    setCurrentPropertyId(propertyId);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1D9E75] text-white mb-4">
            <Building2 size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">选择物业</h1>
          <p className="text-gray-600 text-sm mt-2">Select a property to continue</p>
        </div>
        <ul className="space-y-3">
          {memberships.map((m) => (
            <li key={m.propertyId}>
              <button
                type="button"
                onClick={() => choose(m.propertyId)}
                className="w-full text-left rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-[#1D9E75] hover:shadow transition-all"
              >
                <span className="font-semibold text-gray-900">{m.name}</span>
                <span className="block text-xs text-gray-500 mt-1 capitalize">{m.role}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
