import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './Layout';
import { readDemoLocalState } from '../contexts/PropertyContext';

/**
 * Unauthenticated demo shell: requires appMode=demo + guestPropertyId in localStorage.
 */
export function DemoDashboardRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [allowed, setAllowed] = useState(() => Boolean(readDemoLocalState()));

  useEffect(() => {
    const d = readDemoLocalState();
    if (!d) {
      navigate('/demo/BCS3736', { replace: true });
      setAllowed(false);
      return;
    }
    setAllowed(true);
  }, [navigate, location.pathname, location.key]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}
