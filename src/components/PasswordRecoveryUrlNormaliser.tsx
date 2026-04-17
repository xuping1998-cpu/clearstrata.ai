import { useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { urlIndicatesPasswordRecoveryIntent } from '../lib/authRecovery';

/**
 * If the email link lands on the wrong path (e.g. Site URL + deep link) but the hash
 * carries `type=recovery`, rewrite to `/reset-password` while preserving hash/search
 * so Supabase can parse tokens on the dedicated page.
 */
export function PasswordRecoveryUrlNormaliser() {
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    if (location.pathname === '/reset-password') return;
    if (!urlIndicatesPasswordRecoveryIntent()) return;

    const hash = window.location.hash || location.hash || '';
    const search = location.search || '';
    navigate({ pathname: '/reset-password', search, hash }, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
