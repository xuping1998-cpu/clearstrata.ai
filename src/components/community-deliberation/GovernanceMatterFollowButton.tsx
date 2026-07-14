import { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import {
  isGovernanceMatterSubscribed,
  subscribeToGovernanceMatter,
  unsubscribeFromGovernanceMatter,
} from '@/features/governance-matters/governanceMattersApi';
import { MOTION_INTERACTIVE, MOTION_SPINNER } from '@/lib/ui/motionClasses';

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
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500" role="status" aria-live="polite" aria-busy="true">
        <Loader2 className={`h-3.5 w-3.5 ${MOTION_SPINNER}`} aria-hidden />
        {en ? 'Loading follow state…' : '正在加载关注状态…'}
      </div>
    );
  }

  const errorId = `follow-error-${matterId}`;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={busy}
        aria-busy={busy || undefined}
        aria-describedby={error ? errorId : undefined}
        className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40 focus-visible:ring-offset-2 ${MOTION_INTERACTIVE} ${
          following
            ? 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100'
            : 'border-gray-300 bg-white text-gray-800 hover:border-sky-200 hover:bg-sky-50/60'
        }`}
        aria-pressed={following}
      >
        {busy ? (
          <Loader2 className={`h-3.5 w-3.5 ${MOTION_SPINNER}`} aria-hidden />
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
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
