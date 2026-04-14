import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { supabase, type UserRole } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { samePropertyId } from '../lib/propertyIdMatch';
import { canEditPropertyMemberRoles } from '../lib/propertyPermissions';

/** Primary storage key (existing installs). */
const STORAGE_KEY = 'clearstrata-current-property-id';
/** Optional alias for compatibility with docs / external tooling. */
const LEGACY_STORAGE_KEY = 'currentPropertyId';
/** Guest browse (scan /p/:code without login). */
export const GUEST_PROPERTY_STORAGE_KEY = 'guestPropertyId';
export const APP_MODE_STORAGE_KEY = 'appMode';
export const GUEST_PROPERTY_CODE_STORAGE_KEY = 'guestPropertyCode';
export const GUEST_PROPERTY_NAME_STORAGE_KEY = 'guestPropertyName';

export type DemoLocalState = { id: string; code: string; name: string | null };

export function readDemoLocalState(): DemoLocalState | null {
  if (typeof window === 'undefined') return null;
  try {
    if (localStorage.getItem(APP_MODE_STORAGE_KEY) !== 'demo') return null;
    const id = localStorage.getItem(GUEST_PROPERTY_STORAGE_KEY);
    if (!id) return null;
    const code = localStorage.getItem(GUEST_PROPERTY_CODE_STORAGE_KEY) ?? '';
    const name = localStorage.getItem(GUEST_PROPERTY_NAME_STORAGE_KEY);
    return { id, code, name: name || null };
  } catch {
    return null;
  }
}

export function clearPublicDemoLocalStorage(): void {
  try {
    localStorage.removeItem(APP_MODE_STORAGE_KEY);
    localStorage.removeItem(GUEST_PROPERTY_CODE_STORAGE_KEY);
    localStorage.removeItem(GUEST_PROPERTY_NAME_STORAGE_KEY);
    localStorage.removeItem(GUEST_PROPERTY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function readGuestPropertyId(): string | null {
  try {
    return localStorage.getItem(GUEST_PROPERTY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readStoredPropertyId(): string | null {
  try {
    const primary = localStorage.getItem(STORAGE_KEY);
    if (primary) return primary;
    return localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** QR / 深链：与 React Router 同步读取，避免首屏仅 window 带参时漏读。 */
function getPropertyIdFromUrl(searchParams: URLSearchParams): string | null {
  const fromRouter = searchParams.get('propertyId');
  if (fromRouter) return fromRouter;
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('propertyId');
  }
  return null;
}

function persistPropertyId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(LEGACY_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export interface PropertyMembership {
  propertyId: string;
  name: string;
  role: UserRole;
}

/**
 * 优先级：1) URL propertyId（最高） 2) localStorage 3) memberships[0]
 * 仅允许选择用户已加入的物业；URL/缓存中的 ID 会规范为 membership 行内的 canonical id。
 */
function resolvePropertyIdFromSources(
  mems: PropertyMembership[],
  searchParams: URLSearchParams,
): string | null {
  if (mems.length === 0) return null;

  const urlPid = getPropertyIdFromUrl(searchParams);
  const urlHit = urlPid ? mems.find((m) => samePropertyId(m.propertyId, urlPid)) : null;
  if (urlHit) return urlHit.propertyId;

  const saved = readStoredPropertyId();
  const savedHit = saved ? mems.find((m) => samePropertyId(m.propertyId, saved)) : null;
  if (savedHit) return savedHit.propertyId;

  return mems[0].propertyId;
}

interface PropertyContextValue {
  /** Ready after first load for logged-in user (or immediately if logged out). */
  ready: boolean;
  propertyReady: boolean;
  /** Active memberships (same as memberships; SaaS alias). */
  accessibleProperties: PropertyMembership[];
  memberships: PropertyMembership[];
  currentPropertyId: string | null;
  /** Role in the active property (from property_members only). */
  roleInProperty: UserRole | null;
  /** Alias for roleInProperty. */
  currentRole: UserRole | null;
  setCurrentPropertyId: (id: string) => void;
  /** Legacy: always false when memberships exist (default property is auto-selected). */
  needsPropertyChoice: boolean;
  refreshMemberships: () => Promise<void>;
  /** True when viewing a property via scan link without login (guestPropertyId). */
  isGuest: boolean;
  /** Public QR demo: /demo/BCS3736, no login. */
  isDemoMode: boolean;
  /** Set when isDemoMode (e.g. BCS3736). */
  guestPropertyCode: string | null;
  /**
   * Whether the current property has any active staff (admin/council/manager/property_admin).
   * `null` if unknown (loading or RPC error). Filled only for logged-in, non-demo context.
   */
  propertyHasManagementStaff: boolean | null;
}

const PropertyContext = createContext<PropertyContextValue | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user, session, profile } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const guestQuery = searchParams.get('guest');
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const [ready, setReady] = useState(!session);
  const [memberships, setMemberships] = useState<PropertyMembership[]>(() => {
    const d = readDemoLocalState();
    return d
      ? [
          {
            propertyId: d.id,
            name: d.name || d.code || 'Demo',
            role: 'viewer' as UserRole,
          },
        ]
      : [];
  });
  const [currentPropertyId, setCurrentPropertyIdState] = useState<string | null>(() => readDemoLocalState()?.id ?? null);
  const [needsPropertyChoice, setNeedsPropertyChoice] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(() => Boolean(readDemoLocalState()));
  const [guestPropertyCode, setGuestPropertyCodeState] = useState<string | null>(() => readDemoLocalState()?.code ?? null);
  const [propertyHasManagementStaff, setPropertyHasManagementStaff] = useState<boolean | null>(null);

  const loadMemberships = useCallback(async () => {
    if (!user?.id) {
      setMemberships([]);
      setCurrentPropertyIdState(null);
      setNeedsPropertyChoice(false);
      setPropertyHasManagementStaff(null);
      setReady(true);
      return;
    }

    const { data: rows, error } = await supabase
      .from('property_members')
      .select('property_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      console.error('property_members load failed', error);
      setMemberships([]);
      setCurrentPropertyIdState(null);
      setNeedsPropertyChoice(false);
      setPropertyHasManagementStaff(null);
      setReady(true);
      return;
    }

    const list = rows ?? [];
    const byPropertyId = new Map<string, UserRole>();
    for (const r of list) {
      byPropertyId.set(r.property_id as string, r.role as UserRole);
    }
    const uniqueIds = [...byPropertyId.keys()];

    let names: Record<string, string> = {};
    if (uniqueIds.length > 0) {
      const { data: props } = await supabase.from('properties').select('id, name').in('id', uniqueIds);
      for (const p of props ?? []) {
        names[p.id as string] = (p.name as string) || 'Property';
      }
    }

    const mems: PropertyMembership[] = uniqueIds.map((propertyId) => ({
      propertyId,
      name: names[propertyId] || 'Property',
      role: byPropertyId.get(propertyId)!,
    }));

    setMemberships(mems);
    setIsGuest(false);
    setIsDemoMode(false);
    setGuestPropertyCodeState(null);

    if (mems.length === 0) {
      setCurrentPropertyIdState(null);
      setNeedsPropertyChoice(false);
      setPropertyHasManagementStaff(null);
      setReady(true);
      return;
    }

    const chosen = resolvePropertyIdFromSources(mems, searchParamsRef.current);
    setCurrentPropertyIdState(chosen);
    setNeedsPropertyChoice(false);
    if (chosen) {
      persistPropertyId(chosen);
    }
    console.log('[property]', {
      currentPropertyId: chosen,
      membershipsCount: mems.length,
      userId: user.id,
    });

    if (chosen) {
      const { data: staffOk, error: staffRpcErr } = await supabase.rpc('property_has_management_staff', {
        p_property_id: chosen,
      });
      if (staffRpcErr) {
        if (import.meta.env.DEV) {
          console.warn('property_has_management_staff', staffRpcErr);
        }
        setPropertyHasManagementStaff(null);
      } else {
        setPropertyHasManagementStaff(staffOk === true);
      }
    } else {
      setPropertyHasManagementStaff(null);
    }

    setReady(true);
  }, [user?.id]);

  useEffect(() => {
    if (!session) {
      const demo = readDemoLocalState();
      if (demo) {
        setMemberships([
          {
            propertyId: demo.id,
            name: demo.name || demo.code || 'Demo',
            role: 'viewer',
          },
        ]);
        setCurrentPropertyIdState(demo.id);
        setGuestPropertyCodeState(demo.code);
        setIsDemoMode(true);
        setIsGuest(false);
        setNeedsPropertyChoice(false);
        setPropertyHasManagementStaff(null);
        setReady(true);
        return;
      }
      setIsDemoMode(false);
      setGuestPropertyCodeState(null);
      setMemberships([]);
      const gid = readGuestPropertyId();
      const guestMode = guestQuery === '1';
      if (guestMode && gid) {
        setCurrentPropertyIdState(gid);
        setIsGuest(true);
      } else {
        setCurrentPropertyIdState(null);
        setIsGuest(false);
      }
      setNeedsPropertyChoice(false);
      setPropertyHasManagementStaff(null);
      setReady(true);
      return;
    }
    setReady(false);
    void loadMemberships();
  }, [session, loadMemberships, guestQuery, location.pathname]);

  /** URL 含有效 propertyId 且与 state 不一致时，以 URL 为准（扫码 / 前进后退 / 分享链接）。 */
  useEffect(() => {
    if (!ready || memberships.length === 0 || isDemoMode) return;
    const urlPid = getPropertyIdFromUrl(searchParams);
    if (!urlPid) return;
    const urlHit = memberships.find((m) => samePropertyId(m.propertyId, urlPid));
    if (!urlHit) return;
    setCurrentPropertyIdState((prev) => {
      if (samePropertyId(urlHit.propertyId, prev)) return prev;
      persistPropertyId(urlHit.propertyId);
      return urlHit.propertyId;
    });
  }, [searchParams, memberships, ready, isDemoMode]);

  /** current 不在 memberships 内时：仅单物业时回退到唯一物业；多物业未选择时不自动指定。 */
  useEffect(() => {
    if (!ready || memberships.length === 0 || isDemoMode) return;
    const valid =
      currentPropertyId &&
      memberships.some((m) => samePropertyId(m.propertyId, currentPropertyId));
    if (valid) return;
    if (memberships.length > 1) {
      setNeedsPropertyChoice(true);
      return;
    }
    const next = memberships[0].propertyId;
    setCurrentPropertyIdState(next);
    setNeedsPropertyChoice(false);
    persistPropertyId(next);
  }, [memberships, ready, currentPropertyId, isDemoMode]);

  /** 缺失或无效 URL 时，把当前物业写回 query（与 state 对齐）。 */
  useEffect(() => {
    if (!ready || !currentPropertyId || memberships.length === 0 || isDemoMode) return;
    const urlPid = getPropertyIdFromUrl(searchParams);
    if (urlPid && samePropertyId(urlPid, currentPropertyId)) return;
    if (urlPid) {
      const urlHit = memberships.find((m) => samePropertyId(m.propertyId, urlPid));
      if (urlHit) return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('propertyId', currentPropertyId);
        return next;
      },
      { replace: true },
    );
  }, [ready, currentPropertyId, memberships, searchParams, setSearchParams, isDemoMode]);

  const setCurrentPropertyId = useCallback(
    (id: string) => {
      setCurrentPropertyIdState(id);
      setNeedsPropertyChoice(false);
      persistPropertyId(id);
      if (isDemoMode) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('propertyId', id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, isDemoMode],
  );

  const roleInProperty = useMemo(() => {
    if (!currentPropertyId || memberships.length === 0) return null;
    const hit = memberships.find((m) => samePropertyId(m.propertyId, currentPropertyId));
    return hit?.role ?? null;
  }, [currentPropertyId, memberships]);

  const value = useMemo<PropertyContextValue>(
    () => ({
      ready,
      propertyReady: ready,
      accessibleProperties: memberships,
      memberships,
      currentPropertyId,
      roleInProperty,
      currentRole: roleInProperty,
      setCurrentPropertyId,
      needsPropertyChoice,
      refreshMemberships: loadMemberships,
      isGuest,
      isDemoMode,
      guestPropertyCode,
      propertyHasManagementStaff,
    }),
    [
      ready,
      memberships,
      currentPropertyId,
      roleInProperty,
      setCurrentPropertyId,
      needsPropertyChoice,
      loadMemberships,
      isGuest,
      isDemoMode,
      guestPropertyCode,
      propertyHasManagementStaff,
    ],
  );

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider');
  return ctx;
}
