import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import type { MeetingAgendaRow, MeetingRow, VoteRule } from '@/features/meetings/api';
import {
  createFormalResolution,
  fetchFormalResolutionAuditLog,
  logFormalResolutionDelete,
  reorderFormalResolutions,
  transitionFormalResolutionState,
  updateFormalResolution,
  type FormalResolutionAuditRow,
} from '@/features/meetings/formalResolutionAuthoring';
import {
  canEditFormalResolutionContent,
  formalResolutionAuditEventLabel,
  formalResolutionStateLabel,
  isFormalResolutionAgenda,
  normalizeFormalResolutionState,
  type FormalResolutionState,
} from '@/lib/meetings/formalResolutionModel';
import { MeetingResolutionVotePanel } from '@/components/meetings/MeetingResolutionVotePanel';
import { StatusAlert } from '@/components/status/StatusAlert';
import { StatusBadge } from '@/components/status/StatusBadge';
import { supabase } from '@/lib/supabase';
import { findOwnerVoteResolutionForAgenda } from '@/features/meetings/ownerVotingCouncil';
import { labelVoteRule } from '@/features/meetings/labels';
import type { OwnerVoteMeetingLite } from '@/features/meetings/api';

export type MeetingFormalResolutionAuthoringPanelProps = {
  meeting: MeetingRow;
  propertyId: string;
  userId: string;
  agendaItems: MeetingAgendaRow[];
  editLocked: boolean;
  canManage: boolean;
  languageEn: boolean;
  ownerVoteMeeting: OwnerVoteMeetingLite | null;
  eligibleUnitNo?: string | null;
  viewerUserId?: string | null;
  ovResolutions: Array<{ id: string; title: string; display_order?: number | null }>;
  onResolveDeleteBlockReason: (row: MeetingAgendaRow) => Promise<string | null>;
  onEnsureOwnerVoteForResolution: (args: {
    agendaId: string;
    titleZh: string;
    titleEn: string;
    voteRule: VoteRule;
    sortOrder: number;
    isNew: boolean;
    previousTitleZh?: string | null;
    previousTitleEn?: string | null;
    previousSortOrder?: number;
  }) => Promise<void>;
  onChanged: () => Promise<void>;
};

type EditDraft = {
  agendaId: string;
  title_zh: string;
  title_en: string;
  description_zh: string;
  description_en: string;
  vote_rule: VoteRule;
};

function resolutionTitle(row: MeetingAgendaRow, en: boolean): string {
  return (
    row.title_zh?.trim() ||
    row.title_en?.trim() ||
    (en ? 'Untitled resolution' : '未命名决议')
  );
}

function stateBadgeTone(state: FormalResolutionState): 'neutral' | 'warning' | 'success' {
  if (state === 'under_review') return 'warning';
  if (state === 'final') return 'success';
  return 'neutral';
}

export function MeetingFormalResolutionAuthoringPanel({
  meeting,
  propertyId,
  userId,
  agendaItems,
  editLocked,
  canManage,
  languageEn,
  ownerVoteMeeting,
  eligibleUnitNo,
  viewerUserId,
  ovResolutions,
  onResolveDeleteBlockReason,
  onEnsureOwnerVoteForResolution,
  onChanged,
}: MeetingFormalResolutionAuthoringPanelProps) {
  const en = languageEn;
  const formalRows = useMemo(
    () => agendaItems.filter(isFormalResolutionAgenda).sort((a, b) => a.sort_order - b.sort_order),
    [agendaItems],
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newZh, setNewZh] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newDescZh, setNewDescZh] = useState('');
  const [newDescEn, setNewDescEn] = useState('');
  const [newVoteRule, setNewVoteRule] = useState<VoteRule>('simple_majority');
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [auditByAgendaId, setAuditByAgendaId] = useState<Record<string, FormalResolutionAuditRow[]>>({});
  const [auditOpenId, setAuditOpenId] = useState<string | null>(null);
  const [auditLoadingId, setAuditLoadingId] = useState<string | null>(null);

  const nextSortOrder = useMemo(() => {
    if (!agendaItems.length) return 1;
    return Math.max(...agendaItems.map((a) => a.sort_order ?? 0)) + 1;
  }, [agendaItems]);

  const loadAudit = useCallback(
    async (agendaId: string) => {
      setAuditLoadingId(agendaId);
      const { rows, error } = await fetchFormalResolutionAuditLog(propertyId, agendaId);
      setAuditLoadingId(null);
      if (error) {
        setErr(error.message);
        return;
      }
      setAuditByAgendaId((prev) => ({ ...prev, [agendaId]: rows }));
    },
    [propertyId],
  );

  useEffect(() => {
    if (!auditOpenId) return;
    if (auditByAgendaId[auditOpenId]) return;
    void loadAudit(auditOpenId);
  }, [auditOpenId, auditByAgendaId, loadAudit]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage || editLocked) return;
    if (!newZh.trim() && !newEn.trim()) {
      setErr(en ? 'Enter a resolution title.' : '请填写决议标题。');
      return;
    }
    setBusy(true);
    setErr(null);
    const { id, error } = await createFormalResolution({
      propertyId,
      meetingId: meeting.id,
      sortOrder: nextSortOrder,
      titleZh: newZh.trim() || null,
      titleEn: newEn.trim() || null,
      descriptionZh: newDescZh.trim() || null,
      descriptionEn: newDescEn.trim() || null,
      voteRule: newVoteRule,
      actorId: userId,
    });
    if (error || !id) {
      setErr(error?.message ?? (en ? 'Could not create resolution.' : '无法创建决议。'));
      setBusy(false);
      return;
    }
    await onEnsureOwnerVoteForResolution({
      agendaId: id,
      titleZh: newZh.trim(),
      titleEn: newEn.trim(),
      voteRule: newVoteRule,
      sortOrder: nextSortOrder,
      isNew: true,
    });
    setNewZh('');
    setNewEn('');
    setNewDescZh('');
    setNewDescEn('');
    setNewVoteRule('simple_majority');
    setBusy(false);
    await onChanged();
  }

  async function handleSaveEdit() {
    if (!editDraft || !canManage || editLocked) return;
    const row = formalRows.find((r) => r.id === editDraft.agendaId);
    if (!row) return;
    const state = normalizeFormalResolutionState(row.formal_resolution_state);
    if (!canEditFormalResolutionContent(state)) {
      setErr(en ? 'Final resolutions cannot be edited.' : '已定稿的决议不可编辑。');
      return;
    }
    if (!editDraft.title_zh.trim() && !editDraft.title_en.trim()) {
      setErr(en ? 'Enter a title.' : '请填写标题。');
      return;
    }
    setBusy(true);
    setErr(null);
    const version = Number(row.formal_resolution_version ?? 1);
    const { error } = await updateFormalResolution({
      propertyId,
      meetingId: meeting.id,
      agendaItemId: row.id,
      currentVersion: version,
      currentState: state,
      titleZh: editDraft.title_zh.trim() || null,
      titleEn: editDraft.title_en.trim() || null,
      descriptionZh: editDraft.description_zh.trim() || null,
      descriptionEn: editDraft.description_en.trim() || null,
      voteRule: editDraft.vote_rule,
      sortOrder: row.sort_order,
      actorId: userId,
    });
    if (error) {
      setErr(
        error.message === 'FINAL_LOCKED'
          ? en
            ? 'Final resolutions cannot be edited.'
            : '已定稿的决议不可编辑。'
          : error.message,
      );
      setBusy(false);
      return;
    }
    await onEnsureOwnerVoteForResolution({
      agendaId: row.id,
      titleZh: editDraft.title_zh.trim(),
      titleEn: editDraft.title_en.trim(),
      voteRule: editDraft.vote_rule,
      sortOrder: row.sort_order,
      isNew: false,
      previousTitleZh: row.title_zh,
      previousTitleEn: row.title_en,
      previousSortOrder: row.sort_order,
    });
    setEditDraft(null);
    setBusy(false);
    await onChanged();
  }

  async function handleDelete(row: MeetingAgendaRow) {
    if (!canManage || editLocked) return;
    const block = await onResolveDeleteBlockReason(row);
    if (block) {
      setErr(block);
      return;
    }
    const confirmed = window.confirm(en ? 'Delete this formal resolution?' : '确认删除该正式决议？');
    if (!confirmed) return;
    setBusy(true);
    setErr(null);
    await logFormalResolutionDelete({
      propertyId,
      meetingId: meeting.id,
      agendaItemId: row.id,
      row,
      actorId: userId,
    });
    const { error } = await supabase
      .from('meeting_agenda_items')
      .delete()
      .eq('property_id', propertyId)
      .eq('meeting_id', meeting.id)
      .eq('id', row.id);
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setEditDraft(null);
    setBusy(false);
    await onChanged();
  }

  async function handleReorder(row: MeetingAgendaRow, direction: 'up' | 'down') {
    if (!canManage || editLocked) return;
    setBusy(true);
    setErr(null);
    const { error, swapped, rows } = await reorderFormalResolutions({
      propertyId,
      meetingId: meeting.id,
      agendaItems,
      agendaItemId: row.id,
      direction,
      actorId: userId,
    });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    if (swapped && rows) {
      for (const r of rows) {
        const matched = findOwnerVoteResolutionForAgenda(
          { sort_order: r.sort_order, title_zh: r.title_zh, title_en: r.title_en },
          ovResolutions,
        );
        if (matched && ownerVoteMeeting?.id) {
          await supabase
            .from('owner_vote_resolutions')
            .update({ display_order: r.sort_order } as Record<string, unknown>)
            .eq('id', matched.id)
            .eq('meeting_id', ownerVoteMeeting.id);
        }
      }
    }
    setBusy(false);
    await onChanged();
  }

  async function handleStateTransition(row: MeetingAgendaRow, target: FormalResolutionState) {
    if (!canManage || editLocked) return;
    setBusy(true);
    setErr(null);
    const current = normalizeFormalResolutionState(row.formal_resolution_state);
    const { error } = await transitionFormalResolutionState({
      propertyId,
      meetingId: meeting.id,
      agendaItemId: row.id,
      currentState: current,
      targetState: target,
      currentVersion: Number(row.formal_resolution_version ?? 1),
      row,
      actorId: userId,
    });
    if (error) {
      setErr(
        error.message === 'INVALID_TRANSITION'
          ? en
            ? 'That state transition is not allowed.'
            : '不允许该状态变更。'
          : error.message,
      );
      setBusy(false);
      return;
    }
    setBusy(false);
    if (auditOpenId === row.id) {
      setAuditByAgendaId((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      void loadAudit(row.id);
    }
    await onChanged();
  }

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-emerald-950">
          {en ? 'Formal resolutions (Meeting authoring)' : '正式决议（会议编制）'}
        </h2>
        <p className="text-sm text-emerald-900/80 mt-1">
          {en
            ? 'Council authors formal motions here. Governance identifies issues; Meeting forms resolutions; Voting approves.'
            : '业委会在此编制正式动议。Governance 提出议题 · Meeting 形成决议 · Voting 完成表决。'}
        </p>
      </div>

      {err ? (
        <StatusAlert tone="danger" className="text-sm">
          {err}
        </StatusAlert>
      ) : null}

      {formalRows.length === 0 ? (
        <p className="text-sm text-gray-700">
          {en ? 'No formal resolutions yet.' : '尚无正式决议。'}
        </p>
      ) : (
        <ul className="space-y-4">
          {formalRows.map((row, idx) => {
            const state = normalizeFormalResolutionState(row.formal_resolution_state);
            const version = Number(row.formal_resolution_version ?? 1);
            const editable = canEditFormalResolutionContent(state);
            const matchedOv = findOwnerVoteResolutionForAgenda(
              { sort_order: row.sort_order, title_zh: row.title_zh, title_en: row.title_en },
              ovResolutions,
            );
            const isEditing = editDraft?.agendaId === row.id;
            const auditRows = auditByAgendaId[row.id] ?? [];

            return (
              <li key={row.id} className="rounded-lg border border-emerald-100 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">#{idx + 1}</span>
                      <StatusBadge tone={stateBadgeTone(state)} size="sm">
                        {formalResolutionStateLabel(state, en)}
                      </StatusBadge>
                      <StatusBadge tone="success" size="sm">
                        {en ? 'Formal resolution' : '正式决议'}
                      </StatusBadge>
                      {row.vote_rule ? (
                        <StatusBadge tone="neutral" size="sm">
                          {labelVoteRule(row.vote_rule, en)}
                        </StatusBadge>
                      ) : null}
                      <span className="text-xs text-gray-500">
                        v{version}
                        {row.formal_resolution_modified_at
                          ? ` · ${new Date(row.formal_resolution_modified_at).toLocaleString()}`
                          : ''}
                      </span>
                    </div>
                    {!isEditing ? (
                      <>
                        <h3 className="font-medium text-gray-900">{resolutionTitle(row, en)}</h3>
                        {(row.description_zh?.trim() || row.description_en?.trim()) ? (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {row.description_zh?.trim() || row.description_en}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  {canManage && !editLocked ? (
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={busy || idx === 0}
                        onClick={() => void handleReorder(row, 'up')}
                        className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                        title={en ? 'Move up' : '上移'}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={busy || idx === formalRows.length - 1}
                        onClick={() => void handleReorder(row, 'down')}
                        className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                        title={en ? 'Move down' : '下移'}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="space-y-3 border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={editDraft.title_zh}
                        onChange={(e) => setEditDraft((p) => (p ? { ...p, title_zh: e.target.value } : p))}
                        placeholder={en ? 'Title (Chinese)' : '标题（中文）'}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        value={editDraft.title_en}
                        onChange={(e) => setEditDraft((p) => (p ? { ...p, title_en: e.target.value } : p))}
                        placeholder={en ? 'Title (English)' : '标题（英文）'}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={editDraft.description_zh}
                      onChange={(e) => setEditDraft((p) => (p ? { ...p, description_zh: e.target.value } : p))}
                      placeholder={en ? 'Description (Chinese)' : '说明（中文）'}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editDraft.description_en}
                      onChange={(e) => setEditDraft((p) => (p ? { ...p, description_en: e.target.value } : p))}
                      placeholder={en ? 'Description (English)' : '说明（英文）'}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <label className="block text-sm space-y-1">
                      <span className="font-medium">{en ? 'Vote threshold' : '表决门槛'}</span>
                      <select
                        value={editDraft.vote_rule}
                        onChange={(e) =>
                          setEditDraft((p) => (p ? { ...p, vote_rule: e.target.value as VoteRule } : p))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="simple_majority">{en ? 'Simple majority' : '普通多数'}</option>
                        <option value="three_quarter">{en ? 'Three-quarters' : '3/4 票'}</option>
                        <option value="unanimous">{en ? 'Unanimous' : '全票通过'}</option>
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSaveEdit()}
                        className="text-sm px-4 py-2 rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                      >
                        {en ? 'Save' : '保存'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditDraft(null)}
                        className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        {en ? 'Cancel' : '取消'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {canManage && !editLocked && !isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {editable ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setEditDraft({
                            agendaId: row.id,
                            title_zh: row.title_zh ?? '',
                            title_en: row.title_en ?? '',
                            description_zh: row.description_zh ?? '',
                            description_en: row.description_en ?? '',
                            vote_rule: (row.vote_rule ?? 'simple_majority') as VoteRule,
                          })
                        }
                        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {en ? 'Edit' : '编辑'}
                      </button>
                    ) : null}
                    {state === 'draft' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleStateTransition(row, 'under_review')}
                        className="text-sm px-3 py-1.5 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                      >
                        {en ? 'Submit for review' : '提交审议'}
                      </button>
                    ) : null}
                    {state === 'under_review' ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleStateTransition(row, 'draft')}
                          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {en ? 'Back to draft' : '退回草稿'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleStateTransition(row, 'final')}
                          className="text-sm px-3 py-1.5 rounded-lg border border-emerald-400 text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {en ? 'Mark final' : '标记定稿'}
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(row)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-800 hover:bg-red-50 disabled:opacity-50"
                    >
                      {en ? 'Delete' : '删除'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setAuditOpenId((cur) => (cur === row.id ? null : row.id))}
                      className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-1"
                    >
                      <History className="w-3.5 h-3.5" />
                      {en ? 'Audit' : '审计'}
                    </button>
                  </div>
                ) : null}

                {auditOpenId === row.id ? (
                  <div className="rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs space-y-2">
                    {auditLoadingId === row.id ? (
                      <p className="text-gray-600">{en ? 'Loading audit…' : '加载审计记录…'}</p>
                    ) : auditRows.length === 0 ? (
                      <p className="text-gray-600">{en ? 'No audit entries yet.' : '暂无审计记录。'}</p>
                    ) : (
                      <ul className="space-y-1">
                        {auditRows.map((a) => (
                          <li key={a.id} className="flex flex-wrap gap-x-2 text-gray-700">
                            <span className="font-medium text-gray-900">
                              {formalResolutionAuditEventLabel(a.event_kind, en)}
                            </span>
                            <span>v{a.version}</span>
                            {a.resolution_state ? (
                              <span>{formalResolutionStateLabel(a.resolution_state as FormalResolutionState, en)}</span>
                            ) : null}
                            <span className="text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <MeetingResolutionVotePanel
                  agenda={row}
                  councilMeeting={meeting}
                  ownerVoteMeeting={ownerVoteMeeting}
                  resolutionId={matchedOv?.id ?? null}
                  eligibleUnitNo={eligibleUnitNo}
                  userId={viewerUserId}
                  canEnsureResolution={canManage}
                  languageEn={en}
                  onUpdated={onChanged}
                />
              </li>
            );
          })}
        </ul>
      )}

      {canManage && !editLocked ? (
        <form onSubmit={handleCreate} className="border border-dashed border-emerald-300 rounded-lg p-4 space-y-3 bg-white">
          <p className="text-sm font-medium text-gray-800">{en ? 'Add formal resolution' : '添加正式决议'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={newZh}
              onChange={(e) => setNewZh(e.target.value)}
              placeholder={en ? 'Title (Chinese)' : '标题（中文）'}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={newEn}
              onChange={(e) => setNewEn(e.target.value)}
              placeholder={en ? 'Title (English)' : '标题（英文）'}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={newDescZh}
            onChange={(e) => setNewDescZh(e.target.value)}
            placeholder={en ? 'Description (Chinese)' : '说明（中文）'}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <label className="block text-sm space-y-1">
            <span className="font-medium">{en ? 'Vote threshold' : '表决门槛'}</span>
            <select
              value={newVoteRule}
              onChange={(e) => setNewVoteRule(e.target.value as VoteRule)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="simple_majority">{en ? 'Simple majority' : '普通多数'}</option>
              <option value="three_quarter">{en ? 'Three-quarters' : '3/4 票'}</option>
              <option value="unanimous">{en ? 'Unanimous' : '全票通过'}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="text-sm px-4 py-2 rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
          >
            {en ? 'Create resolution' : '创建决议'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
