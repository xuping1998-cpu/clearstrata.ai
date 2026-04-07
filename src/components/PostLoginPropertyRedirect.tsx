import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { resolveUserPropertyAccess } from '../lib/resolveUserPropertyAccess';
import { samePropertyId } from '../lib/propertyIdMatch';

/**
 * 登录且 Property 就绪后，根据 resolveUserPropertyAccess 自动分流（无感进物业 / 选物业 / pending / rejected）。
 * 与 PropertyContext、JoinAccessGate 配合；通过路径与状态守卫避免重复 navigate。
 */
export function PostLoginPropertyRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user } = useAuth();
  const { ready, currentPropertyId, setCurrentPropertyId } = useProperty();
  const currentPropertyIdRef = useRef(currentPropertyId);
  currentPropertyIdRef.current = currentPropertyId;

  useEffect(() => {
    if (!session || !user?.id || !ready) return;

    const path = location.pathname;

    const isJoinApplicationPath =
      path === '/join' ||
      path === '/join-request' ||
      path === '/join/welcome' ||
      path === '/join/invalid';

    let cancelled = false;

    void (async () => {
      const result = await resolveUserPropertyAccess(user.id);
      if (cancelled) return;

      const pathNow =
        typeof window !== 'undefined' ? window.location.pathname : location.pathname;
  console.log('current user id:', user?.id)
console.log('current user email:', user?.email)
    console.log('resolveUserPropertyAccess result:', result);
      console.log('auto property redirect pathname:', pathNow);

      /** 填表页：仅在为 pending/rejected 时跳转，避免打断正常申请 */
      if (isJoinApplicationPath && result.type !== 'pending' && result.type !== 'rejected') {
        return;
      }

      if (result.type === 'single_property') {
        if (!samePropertyId(currentPropertyIdRef.current, result.propertyId)) {
          console.log('auto setCurrentPropertyId:', result.propertyId);
          setCurrentPropertyId(result.propertyId);
        }
        return;
      }

      if (result.type === 'multi_property') {
        if (pathNow === '/select-property') return;
        if (currentPropertyIdRef.current) return;
        navigate('/select-property', { replace: true });
        return;
      }

      if (result.type === 'pending') {
        if (pathNow === '/join/pending') return;
        navigate('/join/pending', { replace: true });
        return;
      }

      if (result.type === 'rejected') {
        if (pathNow === '/join/rejected') return;
        navigate('/join/rejected', { replace: true });
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, user?.id, ready, location.pathname, navigate, setCurrentPropertyId]);

  return null;
}
