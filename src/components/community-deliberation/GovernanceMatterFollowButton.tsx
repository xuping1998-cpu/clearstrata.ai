import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import {
  isGovernanceMatterSubscribed,
  subscribeToGovernanceMatter,
  unsubscribeFromGovernanceMatter,
} from '@/features/governance-matters/governanceMattersApi';

export type GovernanceMatterFollowButtonProps = {
  propertyId: string;
  matterId: string;
  langEn: boolean;
};

export function GovernanceMatterFollowButton({
  propertyId,
  matterId,
  langEn,
}: GovernanceMatterFollowButtonProps) {
  const en = langEn;
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pid = propertyId.trim();
    const mid = matterId.trim();
    if (!pid || !mid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const subscribed = await isGovernanceMatterSubscribed(pid, mid);
        if (!cancelled) setFollowing(subscribed);
      } catch {
        if (!cancelled) setFollowing(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [propertyId, matterId]);

  async function handleToggle() {
    const pid = propertyId.trim();
    const mid = matterId.trim();
    if (!pid || !mid || busy) return;

    setBusy(true);
    setError(null);
    try {
      if (following) {
        await unsubscribeFromGovernanceMatter({ propertyId: pid, matterId: mid });
        setFollowing(false);
      } else {
        await subscribeToGovernanceMatter({ propertyId: pid, matterId: mid });
        setFollowing(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : en ? 'Could not update follow state' : '无法更新关注状态');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {en ? 'Loading…' : '加载中…'}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={busy}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
          following
            ? 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100'
            : 'border-gray-300 bg-white text-gray-800 hover:border-sky-200 hover:bg-sky-50/60'
        }`}
        aria-pressed={following}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Bell className={`h-3.5 w-3.5 ${following ? 'fill-sky-600 text-sky-600' : ''}`} aria-hidden />
        )}
        {following
          ? en
            ? 'Following'
            : '已关注'
          : en
            ? 'Follow Matter'
            : '关注事项'}
      </button>
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
