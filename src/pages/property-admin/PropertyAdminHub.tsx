import { useCallback, useState, useEffect } from 'react';
import { Link, Navigate, NavLink } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  canAccessPropertySettingsPage,
  canApproveJoinRequest,
  canInvitePropertyManager,
  canManagePropertyAdmin,
  canManagePropertyInvites,
  canManageUnitWhitelist,
} from '../../lib/propertyPermissions';

/**
 * 物业设置：仅物业级规则与配置（不含成员列表、加入申请、邀请码清单）。
 * 成员 / 申请 / 邀请码统一在「系统管理 → 人员管理」。
 */
export function PropertySettingsPage() {
  const { currentPropertyId, currentRole, isDemoPropertyMock } = useProperty();

  if (!currentPropertyId || !canAccessPropertySettingsPage(currentRole)) {
    return <Navigate to="/" replace />;
  }

  const showAdmin = canManagePropertyAdmin(currentRole);
  const showSettingsForm = showAdmin || canApproveJoinRequest(currentRole);
  const showInvitesLink = canManagePropertyInvites(currentRole);
  const showUnitWhitelist = canManageUnitWhitelist(currentRole);
  const showManagerInvite =
    !!currentPropertyId && canInvitePropertyManager(currentRole) && !isDemoPropertyMock;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">物业设置</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl">
          配置本物业的加入规则、房号白名单及权限策略。
        </p>
      </div>

      <div className="space-y-6">
        {showSettingsForm && !isDemoPropertyMock && currentPropertyId && (
          <SettingsSection propertyId={currentPropertyId} readOnlyName={!showAdmin} />
        )}

        {showManagerInvite && (
          <InviteManagerSection propertyId={currentPropertyId!} />
        )}

        {!isDemoPropertyMock && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">相关配置页面</h2>
            <ul className="space-y-2 text-sm">
              {showUnitWhitelist ? (
                <li>
                  <NavLink
                    to="/property-admin/unit-whitelist"
                    className="font-medium text-clearstrata-ui-primary hover:underline"
                  >
                    房号白名单
                  </NavLink>
                  <span className="text-gray-500"> — 限制可申请或加入的单元号段</span>
                </li>
              ) : null}
              {showInvitesLink ? (
                <>
                  <li>
                    <Link
                      to="/property-admin/invite-analytics"
                      className="font-medium text-clearstrata-ui-primary hover:underline"
                    >
                      邀请码统计
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/property-admin/invites"
                      className="font-medium text-clearstrata-ui-primary hover:underline"
                    >
                      定向邀请管理
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/invites" className="font-medium text-clearstrata-ui-primary hover:underline">
                      链接型邀请码
                    </Link>
                    <span className="text-gray-500"> — 适用于 `/invite` 短链邀请</span>
                  </li>
                </>
              ) : null}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function InviteManagerSection({ propertyId }: { propertyId: string }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const send = useCallback(async () => {
    setFeedback(null);
    const email = managerEmail.trim();
    if (!email.includes('@')) {
      setFeedback({ ok: false, msg: '请填写有效的经理邮箱地址' });
      return;
    }

    try {
      const { data: activeManagers, error: lookupErr } = await supabase
        .from('property_members')
        .select('id, user_id, role, status')
        .eq('property_id', propertyId)
        .eq('role', 'manager')
        .eq('status', 'active');

      if (lookupErr) {
        console.warn('[InviteManagerSection] active manager lookup failed', lookupErr);
      } else if ((activeManagers?.length ?? 0) > 0) {
        const confirmed = window.confirm(
          en
            ? 'This property already has an active manager. Continuing will add another manager. Do you want to continue?'
            : '本物业已有物业经理。继续邀请后将产生多名物业经理。是否继续？',
        );
        if (!confirmed) return;
      }
    } catch (lookupCatch) {
      console.warn('[InviteManagerSection] active manager lookup threw', lookupCatch);
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-manager-invite', {
        body: { propertyId, managerName: managerName.trim(), managerEmail: email },
      });
      if (error) {
        console.error('[send-manager-invite]', error, data);
        setFeedback({ ok: false, msg: '发送失败，请稍后重试' });
        return;
      }
      const payload = data as { ok?: boolean } | null;
      if (!payload?.ok) {
        console.error('[send-manager-invite] response', data);
        setFeedback({ ok: false, msg: '发送失败，请稍后重试' });
        return;
      }
      setFeedback({ ok: true, msg: '邀请邮件已发送' });
      setManagerName('');
      setManagerEmail('');
    } finally {
      setBusy(false);
    }
  }, [propertyId, managerEmail, managerName, en]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-3">
      <h2 className="text-base font-semibold text-gray-900 mb-1">邀请物业经理</h2>
      <p className="text-xs text-gray-500">
        业委会或物业管理员向指定邮箱发送 ClearStrata 邀请链接；收件人需在 7 日内使用<strong>同一邮箱登录</strong>并接受邀请。
      </p>
      <label className="block text-sm font-medium text-gray-700 mb-1">经理姓名（可选）</label>
      <input
        type="text"
        value={managerName}
        onChange={(e) => setManagerName(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
        placeholder="例如：张明"
      />
      <label className="block text-sm font-medium text-gray-700 mb-1">
        经理邮箱 <span className="text-red-500">*</span>
      </label>
      <input
        type="email"
        value={managerEmail}
        onChange={(e) => setManagerEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
        placeholder="manager@example.com"
      />
      {feedback ? (
        <p className={`text-sm ${feedback.ok ? 'text-green-700' : 'text-red-700'}`}>{feedback.msg}</p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void send()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        发送邀请
      </button>
    </div>
  );
}

/** @deprecated 使用 PropertySettingsPage；保留别名供旧引用。 */
export const PropertyAdminHub = PropertySettingsPage;

function SettingsSection({ propertyId, readOnlyName }: { propertyId: string; readOnlyName?: boolean }) {
  const [name, setName] = useState('');
  const [allowPublic, setAllowPublic] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('properties').select('name, allow_public_join_requests').eq('id', propertyId).maybeSingle();
      if (data) {
        setName((data as { name: string }).name);
        setAllowPublic((data as { allow_public_join_requests?: boolean }).allow_public_join_requests ?? true);
      }
    })();
  }, [propertyId]);

  const save = async () => {
    setMsg(null);
    const payload = readOnlyName ? { allow_public_join_requests: allowPublic } : { name, allow_public_join_requests: allowPublic };
    const { error } = await supabase.from('properties').update(payload).eq('id', propertyId);
    if (error) setMsg(error.message);
    else setMsg('已保存');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-3">物业基础信息与加入规则</h2>
      <label className="block text-sm font-medium text-gray-700 mb-1">物业名称</label>
      <input
        value={name}
        readOnly={readOnlyName}
        disabled={readOnlyName}
        onChange={(e) => setName(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 mb-4 disabled:bg-gray-50 disabled:text-gray-600"
      />
      <label className="flex items-center gap-2 mb-4">
        <input type="checkbox" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)} />
        <span className="text-sm text-gray-700">允许公开申请加入（显示在申请页列表）</span>
      </label>
      <button
        type="button"
        onClick={() => void save()}
        className="px-4 py-2 rounded-lg bg-clearstrata-ui-primary text-white text-sm font-medium hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
      >
        保存
      </button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
