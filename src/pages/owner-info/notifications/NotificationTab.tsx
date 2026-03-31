import { useCallback, useEffect, useState } from 'react';
import { Bell, Plus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DEFAULT_STRATA_ID } from '../../../lib/strataConfig';
import {
  fetchMyNotificationReadIds,
  fetchStrataNotifications,
  markNotificationRead,
  subscribeStrataNotificationInserts,
  toggleStrataNotificationPin,
  type StrataNotificationFeedRow,
} from '../../../lib/strataNotificationsApi';
import { CreateNotificationModal } from './CreateNotificationModal';
import { NotificationList, type PriorityFilter } from './NotificationList';

/**
 * Strata-wide notification feed (table `strata_notifications`).
 * Distinct from the legacy bulletin board table `notifications` on the same page.
 */
export function NotificationTab() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';

  const [items, setItems] = useState<(StrataNotificationFeedRow & { isRead: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PriorityFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetail] = useState<StrataNotificationFeedRow | null>(null);

  const strataId = DEFAULT_STRATA_ID;
  const canCreate = profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'council';
  const isAdmin = profile?.role === 'admin';

  const mergeReads = useCallback(async (rows: StrataNotificationFeedRow[]) => {
    if (!profile?.id) {
      setItems(rows.map((r) => ({ ...r, isRead: false })));
      return;
    }
    try {
      const readIds = await fetchMyNotificationReadIds(profile.id);
      setItems(rows.map((r) => ({ ...r, isRead: readIds.has(r.id) })));
    } catch {
      setItems(rows.map((r) => ({ ...r, isRead: false })));
    }
  }, [profile?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchStrataNotifications(strataId);
      await mergeReads(rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLoadError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mergeReads, strataId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsub = subscribeStrataNotificationInserts(strataId, async (row) => {
      if (row.created_by !== profile?.id) {
        setToast(en ? `New notification: ${row.title || ''}` : `新通知：${row.title || ''}`);
        window.setTimeout(() => setToast(null), 5000);
      }
      try {
        const rows = await fetchStrataNotifications(strataId);
        if (profile?.id) {
          const readIds = await fetchMyNotificationReadIds(profile.id);
          setItems(rows.map((r) => ({ ...r, isRead: readIds.has(r.id) })));
        } else {
          setItems(rows.map((r) => ({ ...r, isRead: false })));
        }
      } catch (e) {
        console.error('realtime refresh', e);
      }
    });
    return unsub;
  }, [en, profile?.id, strataId]);

  const handleOpen = async (row: StrataNotificationFeedRow) => {
    setDetail(row);
    if (!profile?.id) return;
    try {
      await markNotificationRead(row.id, profile.id);
      setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, isRead: true } : i)));
    } catch (e: unknown) {
      console.error('mark read', e);
    }
  };

  const handleTogglePin = async (row: StrataNotificationFeedRow, next: boolean) => {
    try {
      await toggleStrataNotificationPin(row.id, next);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(en ? `Could not update pin: ${msg}` : `置顶失败：${msg}`);
    }
  };

  const creatorName =
    detail?.creator &&
    (en ? detail.creator.full_name_en : detail.creator.full_name_zh || detail.creator.full_name_en);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-700">
          <Bell className="text-[#1D9E75]" size={22} aria-hidden />
          <p className="text-sm text-gray-600">
            {en
              ? 'Building notifications with read status and priorities.'
              : '物业通知：优先级、已读状态与置顶。'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600 sr-only" htmlFor="notify-priority-filter">
            {en ? 'Filter' : '筛选'}
          </label>
          <select
            id="notify-priority-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as PriorityFilter)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
          >
            <option value="all">{en ? 'All' : '全部'}</option>
            <option value="normal">{en ? 'Normal' : '普通'}</option>
            <option value="important">{en ? 'Important' : '重要'}</option>
            <option value="urgent">{en ? 'Urgent' : '紧急'}</option>
          </select>
          {canCreate && profile?.id && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#188a66]"
            >
              <Plus size={18} aria-hidden />
              {en ? 'New notification' : '发布通知'}
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          className="rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/10 px-4 py-3 text-sm font-medium text-gray-900 shadow-sm"
          role="status"
        >
          {toast}
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {en ? 'Failed to load notifications: ' : '加载失败：'}
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-12">{en ? 'Loading…' : '加载中…'}</p>
      ) : (
        <NotificationList
          items={items}
          filter={filter}
          language={language}
          isAdmin={isAdmin}
          onOpen={handleOpen}
          onTogglePin={handleTogglePin}
        />
      )}

      {canCreate && profile?.id && (
        <CreateNotificationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => void load()}
          strataId={strataId}
          userId={profile.id}
          language={language}
        />
      )}

      {detail && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
          onKeyDown={(e) => e.key === 'Escape' && setDetail(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl border border-gray-200 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-xl font-bold text-gray-900 pr-2">{detail.title}</h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                {en ? 'Close' : '关闭'}
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">{detail.content}</p>
            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <div>
                {new Date(detail.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </div>
              {creatorName && (
                <div>
                  {en ? 'Author' : '发布人'}: {creatorName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
