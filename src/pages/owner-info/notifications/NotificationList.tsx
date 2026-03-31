import { Pin } from 'lucide-react';
import type { StrataNotificationFeedRow, NotificationPriority } from '../../../lib/strataNotificationsApi';

export type PriorityFilter = 'all' | NotificationPriority;

type Item = StrataNotificationFeedRow & { isRead: boolean };

function priorityBadge(priority: NotificationPriority, en: boolean) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold';
  switch (priority) {
    case 'urgent':
      return (
        <span className={`${base} bg-red-100 text-red-800`} title={en ? 'Urgent' : '紧急'}>
          {en ? 'Urgent' : '紧急'}
        </span>
      );
    case 'important':
      return (
        <span className={`${base} bg-orange-100 text-orange-800`} title={en ? 'Important' : '重要'}>
          {en ? 'Important' : '重要'}
        </span>
      );
    default:
      return (
        <span className={`${base} bg-gray-100 text-gray-700`} title={en ? 'Normal' : '普通'}>
          {en ? 'Normal' : '普通'}
        </span>
      );
  }
}

type Props = {
  items: Item[];
  filter: PriorityFilter;
  language: 'en' | 'zh';
  isAdmin: boolean;
  onOpen: (item: StrataNotificationFeedRow) => void;
  onTogglePin: (item: StrataNotificationFeedRow, nextPinned: boolean) => void;
};

export function NotificationList({ items, filter, language, isAdmin, onOpen, onTogglePin }: Props) {
  const en = language === 'en';

  const filtered = filter === 'all' ? items : items.filter((i) => i.priority === filter);

  if (filtered.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12 rounded-lg border border-dashed border-gray-200 bg-gray-50/80">
        {en ? 'No notifications match this filter.' : '没有符合条件的通知。'}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {filtered.map((row) => {
        const creatorName =
          row.creator &&
          (en ? row.creator.full_name_en : row.creator.full_name_zh || row.creator.full_name_en);
        return (
          <li
            key={row.id}
            className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#1D9E75]/40 cursor-pointer ${
              !row.isRead ? 'font-semibold' : ''
            }`}
            onClick={() => onOpen(row)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(row);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {row.is_pinned && (
                  <span className="text-amber-600 shrink-0" title={en ? 'Pinned' : '置顶'} aria-hidden>
                    📌
                  </span>
                )}
                <h3 className={`text-base text-gray-900 break-words ${!row.isRead ? 'font-bold' : 'font-medium'}`}>
                  {row.title}
                </h3>
                {priorityBadge(row.priority, en)}
                {!row.isRead && (
                  <span className="rounded bg-[#1D9E75]/15 text-[#1D9E75] px-2 py-0.5 text-xs font-medium">
                    {en ? 'Unread' : '未读'}
                  </span>
                )}
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onTogglePin(row, !row.is_pinned);
                  }}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium ${
                    row.is_pinned
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                  title={row.is_pinned ? (en ? 'Unpin' : '取消置顶') : en ? 'Pin' : '置顶'}
                >
                  <Pin size={14} className={row.is_pinned ? 'fill-current' : ''} aria-hidden />
                  {row.is_pinned ? (en ? 'Unpin' : '取消置顶') : en ? 'Pin' : '置顶'}
                </button>
              )}
            </div>
            <p
              className={`mt-2 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3 ${!row.isRead ? 'font-semibold' : ''}`}
            >
              {row.content}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              <time dateTime={row.created_at}>
                {new Date(row.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>
              {creatorName && (
                <span>
                  {en ? 'By' : '发布人'}: {creatorName}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
