import { useState, useEffect } from 'react';
import { Link, Navigate, NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useProperty } from '../../contexts/PropertyContext';
import {
  canAccessPropertySettingsPage,
  canApproveJoinRequest,
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
                    <Link to="/admin/invite-codes" className="font-medium text-clearstrata-ui-primary hover:underline">
                      公开邀请管理
                    </Link>
                    <span className="text-gray-500"> — 公开码与 `/entry?propertyId=…&inviteCode=…` 入楼</span>
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
