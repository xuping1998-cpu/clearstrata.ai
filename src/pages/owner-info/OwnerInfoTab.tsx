import { useState, useEffect, useCallback } from 'react';
import { CreditCard as Edit, Check, Users, Trash2, Building2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface OwnerInfoRecord {
  id: string;
  user_id: string;
  unit_number: string;
  unit_size_sqft: number;
  occupancy_status: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  move_in_date?: string;
  pending_approval: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  owner?: {
    full_name_en: string;
    full_name_zh?: string;
    email: string;
    phone?: string;
  };
}

export function OwnerInfoTab() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [ownerInfos, setOwnerInfos] = useState<OwnerInfoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOwner, setEditingOwner] = useState<OwnerInfoRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    unit_number: '',
    unit_size_sqft: '',
    occupancy_status: 'owner_occupied',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    move_in_date: '',
  });

  /** 业委会、系统管理员或物业经理可审核、查看全部单元 */
  const canReviewOwnerInfo =
    profile?.role === 'council' || profile?.role === 'manager' || profile?.role === 'admin';
  const hidesOwnerSelfServiceForm =
    profile?.role === 'council' || profile?.role === 'admin';

  const loadOwnerInfo = useCallback(async () => {
    if (!profile) return;
    setLoading(true);

    let query = supabase
      .from('owner_info')
      .select(`*, owner:profiles!user_id(full_name_en, full_name_zh, email, phone)`)
      .order('unit_number');

    if (!canReviewOwnerInfo) {
      query = query.eq('user_id', profile.id);
    }

    const { data } = await query;
    setOwnerInfos(data || []);
    setLoading(false);
  }, [profile, canReviewOwnerInfo]);

  useEffect(() => {
    void loadOwnerInfo();
  }, [loadOwnerInfo]);

  const saveOwnerInfo = async () => {
    if (!editingOwner) return;
    await supabase
      .from('owner_info')
      .update({
        unit_number: editingOwner.unit_number,
        unit_size_sqft: editingOwner.unit_size_sqft,
        occupancy_status: editingOwner.occupancy_status,
        emergency_contact_name: editingOwner.emergency_contact_name,
        emergency_contact_phone: editingOwner.emergency_contact_phone,
        move_in_date: editingOwner.move_in_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingOwner.id);
    setEditingOwner(null);
    loadOwnerInfo();
  };

  const approveOwnerInfo = async (id: string) => {
    if (!profile || !canReviewOwnerInfo) return;

    try {
      const { error } = await supabase
        .from('owner_info')
        .update({
          pending_approval: false,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[OwnerInfoTab] approveOwnerInfo failed:', error);
        alert(t('owner_info_approve_failed'));
        return;
      }

      alert(t('owner_info_approved_success'));
      await loadOwnerInfo();
    } catch (e) {
      console.error('[OwnerInfoTab] approveOwnerInfo exception:', e);
      alert(t('owner_info_approve_failed'));
    }
  };

  const deleteOwnerInfo = async (id: string) => {
    await supabase.from('owner_info').delete().eq('id', id);
    setDeletingId(null);
    loadOwnerInfo();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    try {
      const existing = ownerInfos.find((info) => info.user_id === profile.id);
      if (existing) {
        await supabase
          .from('owner_info')
          .update({
            unit_number: formData.unit_number,
            unit_size_sqft: parseFloat(formData.unit_size_sqft),
            occupancy_status: formData.occupancy_status,
            emergency_contact_name: formData.emergency_contact_name,
            emergency_contact_phone: formData.emergency_contact_phone,
            move_in_date: formData.move_in_date || null,
            pending_approval: profile.role === 'owner',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('owner_info').insert({
          user_id: profile.id,
          unit_number: formData.unit_number,
          unit_size_sqft: parseFloat(formData.unit_size_sqft),
          occupancy_status: formData.occupancy_status,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          move_in_date: formData.move_in_date || null,
          pending_approval: profile.role === 'owner',
        });
      }
      setShowForm(false);
      await loadOwnerInfo();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditForm = (info: OwnerInfoRecord) => {
    setFormData({
      unit_number: info.unit_number,
      unit_size_sqft: info.unit_size_sqft.toString(),
      occupancy_status: info.occupancy_status,
      emergency_contact_name: info.emergency_contact_name || '',
      emergency_contact_phone: info.emergency_contact_phone || '',
      move_in_date: info.move_in_date || '',
    });
    setShowForm(true);
  };

  if (loading) {
    return <div className="text-center py-8">{language === 'en' ? 'Loading...' : '加载中...'}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        {ownerInfos.length > 0 && ownerInfos.some((info) => info.user_id === profile?.id) ? (
          <button
            onClick={() => startEditForm(ownerInfos.find((info) => info.user_id === profile?.id)!)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors"
          >
            <Edit size={18} />
            {language === 'en' ? 'Update My Information' : '更新我的信息'}
          </button>
        ) : (
          !hidesOwnerSelfServiceForm && (
            <button
              onClick={() => {
                setFormData({ unit_number: '', unit_size_sqft: '', occupancy_status: 'owner_occupied', emergency_contact_name: '', emergency_contact_phone: '', move_in_date: '' });
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors"
            >
              <Users size={18} />
              {language === 'en' ? 'Add My Information' : '添加我的信息'}
            </button>
          )
        )}
      </div>

      {ownerInfos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">{language === 'en' ? 'No owner information found' : '未找到业主信息'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ownerInfos.map((info) => (
            <div
              key={info.id}
              className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${info.pending_approval ? 'border-yellow-500' : 'border-[#1D9E75]'}`}
            >
              <div className="mb-3">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full inline-block ${
                    info.pending_approval
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {info.pending_approval ? t('owner_info_status_pending') : t('owner_info_status_approved')}
                </span>
              </div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold text-[#1D9E75] mb-1">{language === 'en' ? 'Unit' : '单元'} {info.unit_number}</div>
                  <div className="text-sm text-gray-600">{info.unit_size_sqft} {language === 'en' ? 'sqft' : '平方英尺'}</div>
                </div>
                {canReviewOwnerInfo && !editingOwner && (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingOwner(info)} className="text-[#1D9E75] hover:bg-gray-100 p-2 rounded-lg"><Edit size={18} /></button>
                    <button onClick={() => setDeletingId(info.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                )}
              </div>
              {info.owner && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="font-semibold text-gray-900">{language === 'en' ? info.owner.full_name_en : info.owner.full_name_zh || info.owner.full_name_en}</div>
                  <div className="text-sm text-gray-600">{info.owner.email}</div>
                  {info.owner.phone && <div className="text-sm text-gray-600">{info.owner.phone}</div>}
                </div>
              )}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">{t('owner_info_occupancy')}:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {info.occupancy_status === 'owner_occupied' ? (language === 'en' ? 'Owner Occupied' : '业主自住') : info.occupancy_status === 'rented' ? (language === 'en' ? 'Rented' : '出租') : (language === 'en' ? 'Vacant' : '空置')}
                  </span>
                </div>
                {info.emergency_contact_name && (
                  <div>
                    <span className="text-gray-500">{t('owner_info_emergency')}:</span>{' '}
                    <span className="font-medium text-gray-900">{info.emergency_contact_name}</span>
                    {info.emergency_contact_phone && <div className="text-gray-600 ml-4">{info.emergency_contact_phone}</div>}
                  </div>
                )}
                {info.move_in_date && (
                  <div>
                    <span className="text-gray-500">{language === 'en' ? 'Move-in Date' : '入住日期'}:</span>{' '}
                    <span className="font-medium text-gray-900">{new Date(info.move_in_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-3"><Building2 size={16} className="text-[#1D9E75]" /><h4 className="font-semibold text-gray-900 text-sm">{language === 'en' ? 'Building Information' : '大楼信息'}</h4></div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div><span className="font-medium text-gray-700">{language === 'en' ? 'Building:' : '大楼：'}</span> ClearStrata Tower</div>
                  <div><span className="font-medium text-gray-700">{language === 'en' ? 'Address:' : '地址：'}</span> 123 Main Street, Vancouver, BC</div>
                </div>
              </div>
              {canReviewOwnerInfo && info.pending_approval && (
                <button
                  type="button"
                  onClick={() => approveOwnerInfo(info.id)}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors font-medium"
                >
                  <Check size={18} />
                  {t('owner_info_approve_confirm')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{language === 'en' ? 'My Owner Information' : '我的业主信息'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Unit Number' : '单元号'} *</label>
                <input type="text" required value={formData.unit_number} onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Unit Size (sqft)' : '单元面积'} *</label>
                <input type="number" required step="0.01" value={formData.unit_size_sqft} onChange={(e) => setFormData({ ...formData, unit_size_sqft: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Occupancy Status' : '占用状态'} *</label>
                <select required value={formData.occupancy_status} onChange={(e) => setFormData({ ...formData, occupancy_status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent">
                  <option value="owner_occupied">{language === 'en' ? 'Owner Occupied' : '业主自住'}</option>
                  <option value="rented">{language === 'en' ? 'Rented' : '出租'}</option>
                  <option value="vacant">{language === 'en' ? 'Vacant' : '空置'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Emergency Contact Name' : '紧急联系人'}</label>
                <input type="text" value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Emergency Contact Phone' : '紧急联系人电话'}</label>
                <input type="tel" value={formData.emergency_contact_phone} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{language === 'en' ? 'Move-in Date' : '入住日期'}</label>
                <input type="date" value={formData.move_in_date} onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent" />
              </div>
              {profile?.role === 'owner' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">{language === 'en' ? 'Your information will be submitted for council approval.' : '您的信息将提交给理事会审批。'}</p>
                </div>
              )}
              {profile && !canReviewOwnerInfo && (() => {
                const mine = ownerInfos.find((i) => i.user_id === profile.id);
                if (!mine) return null;
                return (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {language === 'en' ? 'Approval status: ' : '审核状态：'}
                      </span>
                      {mine.pending_approval ? t('owner_info_status_pending') : t('owner_info_status_approved')}
                    </p>
                  </div>
                );
              })()}
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={submitting} className="flex-1 bg-[#1D9E75] text-white py-3 rounded-lg hover:bg-[#178a66] transition-colors disabled:bg-gray-300 font-medium">
                  {submitting ? (language === 'en' ? 'Submitting...' : '提交中...') : (language === 'en' ? 'Submit' : '提交')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                  {language === 'en' ? 'Cancel' : '取消'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{language === 'en' ? 'Edit Owner Information' : '编辑业主信息'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('owner_info_unit')}</label>
                <input type="text" value={editingOwner.unit_number} onChange={(e) => setEditingOwner({ ...editingOwner, unit_number: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('owner_info_size')}</label>
                <input type="number" value={editingOwner.unit_size_sqft} onChange={(e) => setEditingOwner({ ...editingOwner, unit_size_sqft: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('owner_info_occupancy')}</label>
                <select value={editingOwner.occupancy_status} onChange={(e) => setEditingOwner({ ...editingOwner, occupancy_status: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="owner_occupied">{language === 'en' ? 'Owner Occupied' : '业主自住'}</option>
                  <option value="rented">{language === 'en' ? 'Rented' : '出租'}</option>
                  <option value="vacant">{language === 'en' ? 'Vacant' : '空置'}</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={saveOwnerInfo} className="flex-1 bg-[#1D9E75] text-white py-2 rounded-lg hover:bg-[#178a66]">{t('action_save')}</button>
                <button onClick={() => setEditingOwner(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">{t('action_cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{language === 'en' ? 'Confirm Deletion' : '确认删除'}</h2>
            <p className="text-gray-600 mb-6">{language === 'en' ? 'Are you sure you want to delete this owner information?' : '确定要删除此业主信息吗？'}</p>
            <div className="flex gap-3">
              <button onClick={() => deleteOwnerInfo(deletingId)} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">{t('action_delete')}</button>
              <button onClick={() => setDeletingId(null)} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300">{t('action_cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
