import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const GUEST_PROPERTY_KEY = 'guestPropertyId';

function parseInviteRpcPayload(data: unknown): {
  property_id: string;
  expires_at?: string | null;
  max_uses?: number | null;
  used_count?: number | null;
} | null {
  if (data == null) return null;
  const o =
    typeof data === 'string'
      ? (JSON.parse(data) as Record<string, unknown>)
      : (data as Record<string, unknown>);
  const pid = o.property_id;
  if (typeof pid !== 'string') return null;
  return {
    property_id: pid,
    expires_at: typeof o.expires_at === 'string' || o.expires_at === null ? (o.expires_at as string | null) : undefined,
    max_uses: typeof o.max_uses === 'number' ? o.max_uses : null,
    used_count: typeof o.used_count === 'number' ? o.used_count : null,
  };
}

function persistCurrentPropertyId(propertyId: string) {
  try {
    localStorage.setItem('currentPropertyId', propertyId);
    localStorage.setItem('clearstrata-current-property-id', propertyId);
  } catch {
    /* ignore */
  }
}

export function PropertyEntry() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { session, user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (authLoading) return;

      const raw = code?.trim();
      if (!raw) {
        setError('missing_code');
        return;
      }

      const { data: row, error: rpcErr } = await supabase.rpc('get_property_invite_by_code', {
        p_code: raw,
      });

      if (cancelled) return;

      if (rpcErr) {
        setError('invalid_code');
        return;
      }

      const invite = parseInviteRpcPayload(row);
      if (!invite) {
        setError('invalid_code');
        return;
      }

      if (invite.expires_at) {
        const exp = new Date(invite.expires_at).getTime();
        if (Number.isFinite(exp) && exp < Date.now()) {
          setError('expired');
          return;
        }
      }
      if (invite.max_uses != null && invite.used_count != null && invite.used_count >= invite.max_uses) {
        setError('max_uses');
        return;
      }

      if (!session || !user) {
        try {
          localStorage.setItem(GUEST_PROPERTY_KEY, invite.property_id);
        } catch {
          /* ignore */
        }
        navigate('/?guest=1', { replace: true });
        return;
      }

      const { data: pid, error: redeemErr } = await supabase.rpc('redeem_property_invite_code', {
        p_code: raw,
      });

      if (cancelled) return;

      if (redeemErr || pid == null) {
        setError('redeem_failed');
        return;
      }

      persistCurrentPropertyId(String(pid));
      navigate('/', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [code, session, user, navigate, authLoading]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-600" role="status">
          {error === 'invalid_code' || error === 'missing_code'
            ? 'Invalid or missing invite link.'
            : error === 'expired'
              ? 'This invite has expired.'
              : error === 'max_uses'
                ? 'This invite has reached its use limit.'
                : 'Could not apply this invite. Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D9E75] border-t-transparent" />
    </div>
  );
}
