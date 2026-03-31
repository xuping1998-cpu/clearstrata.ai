import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Vote, DollarSign, Users, Scale, FileText } from 'lucide-react';
import { DashboardNotifications } from '../components/DashboardNotifications';

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useAuth();

  const modules = [
    { path: '/procurement', icon: ShoppingCart, label: t('nav_procurement'), color: 'bg-blue-500' },
    { path: '/voting', icon: Vote, label: t('nav_voting'), color: 'bg-purple-500' },
    { path: '/finance', icon: DollarSign, label: t('nav_finance'), color: 'bg-green-500' },
    { path: '/owner-info', icon: Users, label: t('nav_owner_info'), color: 'bg-cyan-500' },
    { path: '/disputes', icon: Scale, label: t('nav_disputes'), color: 'bg-red-500' },
    { path: '/compliance', icon: FileText, label: t('nav_compliance'), color: 'bg-indigo-500' },
  ] as Array<{
    path: string;
    icon: typeof ShoppingCart;
    label: string;
    color: string;
  }>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('nav_dashboard')}
        </h1>
        <p className="text-gray-600">
          {t('roles')}: {t(profile?.role || 'owner')}
        </p>
      </div>

      <DashboardNotifications />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.path}
              onClick={() => navigate(module.path)}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 group"
            >
              <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{module.label}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
}
