import { useState, useEffect, useCallback } from 'react';
import { Plus, ThumbsUp, ThumbsDown, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';

interface AgendaItem {
  id: string;
  meeting_id: string;
  item_number: number;
  title_en: string;
  title_zh?: string;
  description_en?: string;
  description_zh?: string;
  requires_vote: boolean;
  vote_for: number;
  vote_against: number;
  vote_abstain: number;
  user_voted?: boolean;
  user_vote?: string;
}

interface Props {
  meetingId: string;
  meetingStatus: string;
  isCouncil: boolean;
}

export function MeetingAgendaSection({ meetingId, meetingStatus, isCouncil }: Props) {
  const { currentPropertyId } = useProperty();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const l = language === 'en';
  const mt = (en: string | undefined, zh: string | undefined) => {
    if (l) return en || zh || '';
    return zh || en || '';
  };
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({
    title_en: '',
    title_zh: '',
    description_en: '',
    description_zh: '',
    requires_vote: false,
  });

  const loadItems = useCallback(async () => {
    if (!user || !currentPropertyId) return;
    try {
      const { data } = await supabase
        .from('meeting_agenda_items')
        .select('*')
        .eq('property_id', currentPropertyId)
        .eq('meeting_id', meetingId)
        .order('item_number', { ascending: true });

      if (data) {
        const withVotes = await Promise.all(
          data.map(async (item) => {
            const { data: userVote } = await supabase
              .from('meeting_votes')
              .select('vote_decision')
              .eq('property_id', currentPropertyId)
              .eq('agenda_item_id', item.id)
              .eq('voter_id', user.id)
              .maybeSingle();
            return {
              ...item,
              user_voted: !!userVote,
              user_vote: userVote?.vote_decision,
            };
          })
        );
        setItems(withVotes);
      }
    } catch (error) {
      console.error('Error loading agenda items:', error);
    } finally {
      setLoading(false);
    }
  }, [meetingId, user, currentPropertyId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = async () => {
    if (!newItem.title_en) {
      setAddError(t('agenda_title_required'));
      return;
    }
    if (!currentPropertyId) return;

    setSaving(true);
    setAddError(null);

    try {
      const nextNumber = items.length > 0 ? Math.max(...items.map(i => i.item_number)) + 1 : 1;

      const { data, error } = await supabase
        .from('meeting_agenda_items')
        .insert({
          property_id: currentPropertyId,
          meeting_id: meetingId,
          item_number: nextNumber,
          title_en: newItem.title_en,
          title_zh: newItem.title_zh || null,
          description_en: newItem.description_en || null,
          description_zh: newItem.description_zh || null,
          requires_vote: newItem.requires_vote,
        })
        .select();

      if (error) {
        setAddError(l ? `Could not add: ${error.message}` : `添加失败：${error.message}`);
        return;
      }
      if (!data || data.length === 0) {
        setAddError(l ? 'Could not add: insufficient permission' : '添加失败：权限不足');
        return;
      }

      setShowAddForm(false);
      setNewItem({ title_en: '', title_zh: '', description_en: '', description_zh: '', requires_vote: false });
      loadItems();
    } catch (error: any) {
      setAddError(
        l
          ? `Could not add: ${error?.message || 'Unknown error'}`
          : `添加失败：${error?.message || '未知错误'}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const castVote = async (agendaItemId: string, decision: 'for' | 'against' | 'abstain') => {
    if (!user || !currentPropertyId) return;
    try {
      const { error } = await supabase.from('meeting_votes').insert({
        property_id: currentPropertyId,
        agenda_item_id: agendaItemId,
        voter_id: user.id,
        vote_decision: decision,
        is_proxy_vote: false,
      });
      if (error) throw error;
      loadItems();
    } catch (error) {
      console.error('Error casting vote:', error);
      alert(t('vote_failed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {l ? `Agenda Items (${items.length})` : `议题列表 (${items.length})`}
        </h3>
        {isCouncil && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm bg-[#1D9E75] text-white px-3 py-1.5 rounded-lg hover:bg-[#178a66] transition-colors"
          >
            <Plus size={16} />
            {l ? 'Add Item' : '添加议题'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">{l ? 'Add New Agenda Item' : '添加新议题'}</h4>
            <button onClick={() => { setShowAddForm(false); setAddError(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">标题 (English) *</label>
                <input
                  type="text"
                  value={newItem.title_en}
                  onChange={(e) => setNewItem({ ...newItem, title_en: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="Agenda item title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">标题 (中文)</label>
                <input
                  type="text"
                  value={newItem.title_zh}
                  onChange={(e) => setNewItem({ ...newItem, title_zh: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="议题标题"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">描述 (English)</label>
                <textarea
                  value={newItem.description_en}
                  onChange={(e) => setNewItem({ ...newItem, description_en: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">描述 (中文)</label>
                <textarea
                  value={newItem.description_zh}
                  onChange={(e) => setNewItem({ ...newItem, description_zh: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_vote"
                checked={newItem.requires_vote}
                onChange={(e) => setNewItem({ ...newItem, requires_vote: e.target.checked })}
                className="w-4 h-4 text-[#1D9E75] border-gray-300 rounded focus:ring-[#1D9E75]"
              />
              <label htmlFor="requires_vote" className="text-sm text-gray-700">{l ? 'Requires voting' : '需要投票表决'}</label>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{addError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={addItem}
                disabled={saving}
                className="bg-[#1D9E75] text-white px-4 py-2 text-sm rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? (l ? 'Adding...' : '添加中...') : (l ? 'Confirm' : '确认添加')}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setAddError(null); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                {l ? 'Cancel' : '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">{l ? 'No agenda items yet' : '暂无议题'}</p>
          {isCouncil && (
            <p className="text-sm text-gray-400 mt-1">{l ? 'Click "Add Item" to begin' : '点击"添加议题"开始'}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-[#1D9E75]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#1D9E75]">{item.item_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">
                      {mt(item.title_en, item.title_zh)}
                    </h4>
                    {item.requires_vote && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{l ? 'Vote' : '需投票'}</span>
                    )}
                  </div>
                  {mt(item.description_en, item.description_zh) && (
                    <p className="text-sm text-gray-600 mb-3">
                      {mt(item.description_en, item.description_zh)}
                    </p>
                  )}

                  {item.requires_vote && (
                    <div className="mt-2">
                      <div className="flex items-center gap-5 mb-3">
                        <div className="flex items-center gap-1.5">
                          <ThumbsUp size={14} className="text-green-600" />
                          <span className="text-sm font-semibold text-green-700">{item.vote_for}</span>
                          <span className="text-xs text-gray-400">{l ? 'For' : '赞成'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ThumbsDown size={14} className="text-red-600" />
                          <span className="text-sm font-semibold text-red-700">{item.vote_against}</span>
                          <span className="text-xs text-gray-400">{l ? 'Against' : '反对'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-600">{item.vote_abstain}</span>
                          <span className="text-xs text-gray-400">{l ? 'Abstain' : '弃权'}</span>
                        </div>
                      </div>

                      {!item.user_voted && meetingStatus === 'in_progress' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => castVote(item.id, 'for')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            <ThumbsUp size={13} />
                            {l ? 'For' : '赞成'}
                          </button>
                          <button
                            onClick={() => castVote(item.id, 'against')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                          >
                            <ThumbsDown size={13} />
                            {l ? 'Against' : '反对'}
                          </button>
                          <button
                            onClick={() => castVote(item.id, 'abstain')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs font-medium"
                          >
                            {l ? 'Abstain' : '弃权'}
                          </button>
                        </div>
                      )}

                      {item.user_voted && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-gray-600">
                            {l ? 'You voted: ' : '您已投票：'}
                            <span className="font-medium">
                              {item.user_vote === 'for' && (l ? 'For' : '赞成')}
                              {item.user_vote === 'against' && (l ? 'Against' : '反对')}
                              {item.user_vote === 'abstain' && (l ? 'Abstain' : '弃权')}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
