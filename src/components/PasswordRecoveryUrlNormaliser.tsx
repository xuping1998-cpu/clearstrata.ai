import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PasswordRecoveryUrlNormaliser() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = location.hash || '';
    const search = location.search || '';

    const isRecovery =
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      hash.includes('refresh_token') ||
      search.includes('type=recovery');

    if (isRecovery && location.pathname !== '/reset-password') {
      navigate('/reset-password' + hash + search, { replace: true });
    }
  }, [location, navigate]);

  return null;
}
