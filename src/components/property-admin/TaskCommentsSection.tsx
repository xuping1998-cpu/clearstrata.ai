import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export type TaskCommentType = 'comment' | 'approval_note' | 'council_feedback' | 'manager_update';

export type TaskCommentRow = {
  id: string;
  property_id: string;
  task_id: string;
  author_id: string | null;
  comment_type: TaskCommentType;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
};

const COMMENT_TYPES: { value: TaskCommentType; zh: string; en: string }[] = [
  { value: 'comment', zh: '评论', en: 'Comment' },
  { value: 'approval_note', zh: '审批备注', en: 'Approval note' },
  { value: 'council_feedback', zh: '业委会反馈', en: 'Council feedback' },
  { value: 'manager_update', zh: '物业经理说明', en: 'Manager update' },
];

function typeLabel(t: TaskCommentType, en: boolean): string {
  const row = COMMENT_TYPES.find((c) => c.value === t);
  if (!row) return t;
  return en ? row.en : row.zh;
}

type Props = {
  taskId: string;
  propertyId: string;
  canPost: boolean;
  en: boolean;
};

export function TaskCommentsSection({ taskId, propertyId, canPost, en }: Props) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<TaskCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentType, setCommentType] = useState<TaskCommentType>('comment');
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('task_comments load', error);
        setRows([]);
        setLoading(false);
        return;
      }
      const list = (data as TaskCommentRow[]) ?? [];
      setRows(list);

      const ids = [...new Set(list.map((r) => r.author_id).filter(Boolean))] as string[];
      const map: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name_en, full_name_zh').in('id', ids);
        for (const p of profs ?? []) {
          map[p.id] = en ? p.full_name_en : p.full_name_zh || p.full_name_en;
        }
      }
      setAuthorNames(map);
    } finally {
      setLoading(false);
    }
  }, [taskId, propertyId, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!profile?.id || !content.trim()) return;
    setSubmitting(true);
    setMsg(null);
    const { error } = await supabase.from('task_comments').insert({
      property_id: propertyId,
      task_id: taskId,
      author_id: profile.id,
      comment_type: commentType,
      content: content.trim(),
      is_internal: false,
    });
    setSubmitting(false);
    if (error) {
      setMsg(en ? error.message : `提交失败：${error.message}`);
      return;
    }
    setContent('');
    setMsg(en ? 'Posted.' : '已提交');
    void load();
  };

  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageSquare className="text-[#1D9E75]" size={22} />
        <h2 className="text-lg font-bold text-gray-900">{en ? 'Comments & feedback' : '评论与反馈'}</h2>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {en
          ? 'Comments, approval notes, council feedback, or manager updates. Owners can read; staff can post.'
          : '评论、审批备注、业委会反馈、物业经理说明。业主可查看；业委会/管理员/经理/物业管理员可发表。'}
      </p>

      {canPost ? (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">{en ? 'Type' : '类型'}</label>
            <select
              value={commentType}
              onChange={(e) => setCommentType(e.target.value as TaskCommentType)}
              className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {COMMENT_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {en ? c.en : c.zh}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={4}
            placeholder={en ? 'Write your message…' : '输入内容…'}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            type="button"
            disabled={submitting || !content.trim()}
            onClick={() => void submit()}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66] disabled:opacity-50"
          >
            {submitting ? <Loader2 className="inline animate-spin" size={18} /> : null}{' '}
            {en ? 'Submit' : '提交'}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          {en ? 'Only council, admin, manager, or property admin can post here.' : '仅业委会、管理员、物业经理、物业管理员可发表评论。'}
        </p>
      )}

      {msg ? (
        <p className={`mt-2 text-sm ${/失败|error/i.test(msg) ? 'text-red-700' : 'text-emerald-700'}`}>{msg}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">{en ? 'No comments yet.' : '暂无评论。'}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((r) => {
            const author =
              r.author_id && authorNames[r.author_id]
                ? authorNames[r.author_id]
                : r.author_id
                  ? en
                    ? 'Member'
                    : '成员'
                  : en
                    ? 'System'
                    : '系统';
            return (
              <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-800">
                    {typeLabel(r.comment_type, en)}
                  </span>
                  <span className="text-gray-600">{author}</span>
                  <span className="text-gray-400">
                    {new Date(r.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">{r.content}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
