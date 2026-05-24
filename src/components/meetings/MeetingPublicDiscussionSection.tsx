import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import type { MeetingRow } from '@/features/meetings/api';
import { supabase } from '@/lib/supabase';

type MeetingLike = Pick<MeetingRow, 'id' | 'property_id' | 'created_by' | 'scheduled_at' | 'status'>;

type MeetingPublicComment = {
  id: string;
  property_id: string;
  meeting_id: string;
  parent_id: string | null;
  user_id: string;
  unit_no: string | null;
  author_name: string | null;
  body: string;
  comment_type: 'opening' | 'comment' | 'reply';
  status: 'visible' | 'withdrawn' | 'hidden';
  created_at: string;
  updated_at: string;
};

type RpcPayload = { ok?: boolean; error?: string; id?: string } | null;

type Props = {
  meeting: MeetingLike;
  currentUserId: string | null;
  en: boolean;
};

const COMMENT_SELECT =
  'id,property_id,meeting_id,parent_id,user_id,unit_no,author_name,body,comment_type,status,created_at,updated_at';

function fmtLocalTime(iso: string, en: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(en ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

function parseRpcOk(data: unknown): RpcPayload {
  if (data && typeof data === 'object') return data as RpcPayload;
  return null;
}

export function MeetingPublicDiscussionSection({ meeting, currentUserId, en }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<MeetingPublicComment[]>([]);
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [openingDraft, setOpeningDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [openingBusy, setOpeningBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [replyBusy, setReplyBusy] = useState(false);
  const [withdrawBusyId, setWithdrawBusyId] = useState<string | null>(null);
  const [hideBusyId, setHideBusyId] = useState<string | null>(null);

  const actionFailedText = en ? 'Action failed. Please try again.' : '操作失败，请稍后重试。';

  const loadComments = useCallback(async () => {
    const { data, error } = await supabase
      .from('meeting_public_comments')
      .select(COMMENT_SELECT)
      .eq('meeting_id', meeting.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[MeetingPublicDiscussionSection] load comments', error);
      return;
    }
    setComments((data ?? []) as MeetingPublicComment[]);
  }, [meeting.id]);

  const loadFlags = useCallback(async () => {
    const [openRes, modRes] = await Promise.all([
      supabase.rpc('is_meeting_public_discussion_open', { p_meeting_id: meeting.id }),
      supabase.rpc('is_meeting_discussion_moderator', { p_meeting_id: meeting.id }),
    ]);

    if (openRes.error) {
      console.error('[MeetingPublicDiscussionSection] is_meeting_public_discussion_open', openRes.error);
      setDiscussionOpen(false);
    } else {
      setDiscussionOpen(openRes.data === true);
    }

    if (modRes.error) {
      console.error('[MeetingPublicDiscussionSection] is_meeting_discussion_moderator', modRes.error);
      setIsModerator(false);
    } else {
      setIsModerator(modRes.data === true);
    }
  }, [meeting.id]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadComments(), loadFlags()]);
    } finally {
      setLoading(false);
    }
  }, [loadComments, loadFlags]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const openingComment = useMemo(
    () => comments.find((c) => c.comment_type === 'opening' && c.parent_id === null),
    [comments],
  );

  const canEditOpeningStatement = isModerator && discussionOpen;

  useEffect(() => {
    if (openingComment?.status === 'visible') {
      setOpeningDraft(openingComment.body);
    } else if (!openingComment) {
      setOpeningDraft('');
    }
  }, [meeting.id, openingComment?.id, openingComment?.body, openingComment?.status]);

  const mainComments = useMemo(
    () => comments.filter((c) => c.comment_type === 'comment' && c.parent_id === null),
    [comments],
  );

  const repliesByParentId = useMemo(() => {
    const map = new Map<string, MeetingPublicComment[]>();
    for (const c of comments) {
      if (c.comment_type !== 'reply' || !c.parent_id) continue;
      const list = map.get(c.parent_id) ?? [];
      list.push(c);
      map.set(c.parent_id, list);
    }
    return map;
  }, [comments]);

  async function handleSaveOpening() {
    const body = openingDraft.trim();
    if (!body) return;
    setActionError(null);
    setOpeningBusy(true);
    try {
      const { data, error } = await supabase.rpc('set_meeting_opening_statement', {
        p_meeting_id: meeting.id,
        p_body: body,
      });
      if (error) throw error;
      const payload = parseRpcOk(data);
      if (payload?.ok === false) {
        console.error('[MeetingPublicDiscussionSection] set_meeting_opening_statement', payload.error);
        setActionError(actionFailedText);
        return;
      }
      await loadComments();
    } catch (e) {
      console.error('[MeetingPublicDiscussionSection] set_meeting_opening_statement', e);
      setActionError(actionFailedText);
    } finally {
      setOpeningBusy(false);
    }
  }

  async function handlePostComment() {
    const body = commentDraft.trim();
    if (!body) return;
    setActionError(null);
    setCommentBusy(true);
    try {
      const { data, error } = await supabase.rpc('add_meeting_public_comment', {
        p_meeting_id: meeting.id,
        p_body: body,
        p_parent_id: null,
      });
      if (error) throw error;
      const payload = parseRpcOk(data);
      if (payload?.ok === false) {
        console.error('[MeetingPublicDiscussionSection] add_meeting_public_comment', payload.error);
        setActionError(actionFailedText);
        return;
      }
      setCommentDraft('');
      await loadComments();
    } catch (e) {
      console.error('[MeetingPublicDiscussionSection] add_meeting_public_comment', e);
      setActionError(actionFailedText);
    } finally {
      setCommentBusy(false);
    }
  }

  async function handlePostReply(parentId: string) {
    const body = replyDraft.trim();
    if (!body) return;
    setActionError(null);
    setReplyBusy(true);
    try {
      const { data, error } = await supabase.rpc('add_meeting_public_comment', {
        p_meeting_id: meeting.id,
        p_body: body,
        p_parent_id: parentId,
      });
      if (error) throw error;
      const payload = parseRpcOk(data);
      if (payload?.ok === false) {
        console.error('[MeetingPublicDiscussionSection] add_meeting_public_comment reply', payload.error);
        setActionError(actionFailedText);
        return;
      }
      setReplyDraft('');
      setReplyOpenId(null);
      await loadComments();
    } catch (e) {
      console.error('[MeetingPublicDiscussionSection] add_meeting_public_comment reply', e);
      setActionError(actionFailedText);
    } finally {
      setReplyBusy(false);
    }
  }

  async function handleWithdraw(commentId: string) {
    setActionError(null);
    setWithdrawBusyId(commentId);
    try {
      const { data, error } = await supabase.rpc('withdraw_meeting_public_comment', {
        p_comment_id: commentId,
      });
      if (error) throw error;
      const payload = parseRpcOk(data);
      if (payload?.ok === false) {
        console.error('[MeetingPublicDiscussionSection] withdraw_meeting_public_comment', payload.error);
        setActionError(actionFailedText);
        return;
      }
      await loadComments();
    } catch (e) {
      console.error('[MeetingPublicDiscussionSection] withdraw_meeting_public_comment', e);
      setActionError(actionFailedText);
    } finally {
      setWithdrawBusyId(null);
    }
  }

  async function handleHide(commentId: string) {
    setActionError(null);
    setHideBusyId(commentId);
    try {
      const { data, error } = await supabase.rpc('hide_meeting_public_comment', {
        p_comment_id: commentId,
      });
      if (error) throw error;
      const payload = parseRpcOk(data);
      if (payload?.ok === false) {
        console.error('[MeetingPublicDiscussionSection] hide_meeting_public_comment', payload.error);
        setActionError(actionFailedText);
        return;
      }
      await loadComments();
    } catch (e) {
      console.error('[MeetingPublicDiscussionSection] hide_meeting_public_comment', e);
      setActionError(actionFailedText);
    } finally {
      setHideBusyId(null);
    }
  }

  function renderBodyText(comment: MeetingPublicComment): string {
    if (comment.status === 'withdrawn') {
      return en ? 'This comment was withdrawn.' : '此留言已撤回';
    }
    if (comment.status === 'hidden') {
      return en ? 'This comment was hidden.' : '此留言已隐藏';
    }
    return comment.body;
  }

  function renderCommentActions(comment: MeetingPublicComment) {
    const canWithdraw =
      currentUserId &&
      comment.user_id === currentUserId &&
      comment.status === 'visible' &&
      (comment.comment_type === 'comment' || comment.comment_type === 'reply');

    const canHide =
      isModerator &&
      comment.status === 'visible' &&
      (comment.comment_type === 'comment' || comment.comment_type === 'reply');

    if (!canWithdraw && !canHide) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {canWithdraw ? (
          <button
            type="button"
            disabled={withdrawBusyId === comment.id}
            onClick={() => void handleWithdraw(comment.id)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {en ? 'Withdraw' : '撤回'}
          </button>
        ) : null}
        {canHide ? (
          <button
            type="button"
            disabled={hideBusyId === comment.id}
            onClick={() => void handleHide(comment.id)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {en ? 'Hide' : '隐藏'}
          </button>
        ) : null}
      </div>
    );
  }

  function renderCommentCard(comment: MeetingPublicComment, isReply = false) {
    const muted = comment.status !== 'visible';
    const authorLabel =
      comment.author_name?.trim() || (en ? 'Owner' : '业主');
    const unitLabel = comment.unit_no?.trim()
      ? en
        ? `Unit: ${comment.unit_no.trim()}`
        : `房号：${comment.unit_no.trim()}`
      : null;

    return (
      <div
        key={comment.id}
        className={`rounded-lg border px-3 py-3 ${
          isReply
            ? 'ml-4 sm:ml-6 border-gray-100 bg-white/80'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-500">
          <span className="font-semibold text-gray-800">{authorLabel}</span>
          {unitLabel ? <span>{unitLabel}</span> : null}
          <span>{fmtLocalTime(comment.created_at, en)}</span>
        </div>
        <p
          className={`mt-2 whitespace-pre-wrap text-sm ${
            muted ? 'italic text-gray-400' : 'text-gray-800'
          }`}
        >
          {renderBodyText(comment)}
        </p>
        {renderCommentActions(comment)}
        {!isReply &&
        discussionOpen &&
        comment.status === 'visible' &&
        comment.comment_type === 'comment' ? (
          <div className="mt-2">
            {replyOpenId === comment.id ? (
              <div className="space-y-2">
                <textarea
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder={en ? 'Write a reply…' : '输入回复…'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={replyBusy || !replyDraft.trim()}
                    onClick={() => void handlePostReply(comment.id)}
                    className="rounded-lg border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {en ? 'Post reply' : '发表回复'}
                  </button>
                  <button
                    type="button"
                    disabled={replyBusy}
                    onClick={() => {
                      setReplyOpenId(null);
                      setReplyDraft('');
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {en ? 'Cancel' : '取消'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setReplyOpenId(comment.id);
                  setReplyDraft('');
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {en ? 'Reply' : '回复'}
              </button>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <MessageSquare className="size-4 shrink-0 text-slate-600" aria-hidden />
          <h3 className="text-base font-semibold text-gray-900">
            {en ? 'Public Discussion' : '公示与讨论'}
          </h3>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
        >
          {expanded ? (en ? 'Collapse' : '收起') : en ? 'Expand' : '展开'}
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        {en
          ? 'Opening statements, owner comments, and official replies are recorded here.'
          : '会议开场发言、业主留言与正式回复将在此留痕归档。'}
      </p>

      {expanded ? (
        <div className="mt-3 space-y-4 border-t border-slate-200/80 pt-3">
          {loading ? (
            <p className="text-xs text-gray-500">{en ? 'Loading discussion…' : '正在加载讨论…'}</p>
          ) : null}

          {actionError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {actionError}
            </p>
          ) : null}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {en ? 'Opening statement' : '开场发言'}
            </h4>
            {!canEditOpeningStatement ? (
              openingComment?.status === 'visible' ? (
                <div className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-gray-500">
                    <span className="font-semibold text-gray-800">
                      {openingComment.author_name?.trim() || (en ? 'Moderator' : '主持人')}
                    </span>
                    {openingComment.unit_no?.trim() ? (
                      <span>
                        {en
                          ? `Unit: ${openingComment.unit_no.trim()}`
                          : `房号：${openingComment.unit_no.trim()}`}
                      </span>
                    ) : null}
                    <span>{fmtLocalTime(openingComment.created_at, en)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{openingComment.body}</p>
                </div>
              ) : openingComment ? (
                <p className="text-sm italic text-gray-400">{renderBodyText(openingComment)}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {en ? 'No opening statement yet.' : '暂无开场发言。'}
                </p>
              )
            ) : null}

            {canEditOpeningStatement ? (
              <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                <textarea
                  value={openingDraft}
                  onChange={(e) => setOpeningDraft(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder={
                    en
                      ? 'Enter the opening statement, including meeting purpose, discussion rules, and key dates.'
                      : '请输入会议开场发言，例如会议目的、讨论规则和重要日期。'
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  disabled={openingBusy || !openingDraft.trim()}
                  onClick={() => void handleSaveOpening()}
                  className="rounded-lg border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {en ? 'Save opening statement' : '保存开场发言'}
                </button>
              </div>
            ) : null}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">
              {en ? 'Comments' : '留言'}
            </h4>

            {mainComments.length === 0 ? (
              <p className="text-sm text-gray-500">
                {en ? 'No comments yet.' : '暂无留言。'}
              </p>
            ) : (
              <div className="space-y-3">
                {mainComments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    {renderCommentCard(comment)}
                    {(repliesByParentId.get(comment.id) ?? []).map((reply) =>
                      renderCommentCard(reply, true),
                    )}
                  </div>
                ))}
              </div>
            )}

            {discussionOpen ? (
              <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder={en ? 'Share your comment…' : '发表您的留言…'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  disabled={commentBusy || !commentDraft.trim()}
                  onClick={() => void handlePostComment()}
                  className="rounded-lg border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {en ? 'Post comment' : '发表留言'}
                </button>
              </div>
            ) : (
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                {en
                  ? 'Discussion is closed. Comments are read-only.'
                  : '讨论已结束，留言只读。'}
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
