import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isPlatformAdmin } from '@/lib/permissions';

export function PlatformAdminRoute({ children }: { children: ReactNode }) {
  const { session, loading, profile } = useAuth();
  if (!session) return <Navigate to="/" replace />;
  if (loading) return null;
  if (!isPlatformAdmin(profile as any)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

