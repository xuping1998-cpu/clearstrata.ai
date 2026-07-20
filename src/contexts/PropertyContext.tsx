import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { useLocation, useSearchParams } from 'react-router-dom';
import { supabase, type UserRole } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { samePropertyId } from '../lib/propertyIdMatch';
import { shouldDeferAutoPropertyRedirects } from '../lib/authRecovery';
import { DEMO_PROPERTY_MOCK_ID } from '../lib/demoPropertyMockData';

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

function readUrlDemoPropertyMock(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.pathname.startsWith('/demo-property')) return true;
  return new URLSearchParams(window.location.search).get('mode') === 'demo';
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
  unitNo?: string | null;
  unitId?: string | null;
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
   * 纯前端演示楼：`/demo-property/*` 或任意路由 `?mode=demo`。不请求 Supabase、不写库。
   */
  isDemoPropertyMock: boolean;
  /**
   * Whether the current property has any active staff (admin/council/manager/property_admin).
   * `null` if unknown (loading or RPC error). Filled only for logged-in, non-demo context.
   */
  propertyHasManagementStaff: boolean | null;
}

const PropertyContext = createContext<PropertyContextValue | undefined>(undefined);

function computeInitialPropertyReady(session: Session | null, authLoading: boolean): boolean {
  if (readUrlDemoPropertyMock()) return true;
  if (readDemoLocalState()) return true;
  if (authLoading) return false;
  if (!session) return true;
  return false;
}

function computeInitialPropertyId(): string | null {
  if (readUrlDemoPropertyMock()) return DEMO_PROPERTY_MOCK_ID;
  const demoId = readDemoLocalState()?.id;
  if (demoId) return demoId;
  return readStoredPropertyId();
}

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const guestQuery = searchParams.get('guest');
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const [ready, setReady] = useState(() => computeInitialPropertyReady(session, authLoading));
  const [memberships, setMemberships] = useState<PropertyMembership[]>(() => {
    if (readUrlDemoPropertyMock()) {
      return [
        {
          propertyId: DEMO_PROPERTY_MOCK_ID,
          name: '演示楼（Demo Property）',
          role: 'property_admin' as UserRole,
        },
      ];
    }
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
  const [currentPropertyId, setCurrentPropertyIdState] = useState<string | null>(computeInitialPropertyId);
  const [needsPropertyChoice, setNeedsPropertyChoice] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(() => Boolean(readDemoLocalState()));
  const [guestPropertyCode, setGuestPropertyCodeState] = useState<string | null>(() => readDemoLocalState()?.code ?? null);
  const [propertyHasManagementStaff, setPropertyHasManagementStaff] = useState<boolean | null>(null);
  const [isDemoPropertyMock, setIsDemoPropertyMock] = useState(readUrlDemoPropertyMock);
  const isDemoPropertyMockRef = useRef(readUrlDemoPropertyMock());

  const loadMemberships = useCallback(async () => {
    if (isDemoPropertyMockRef.current) {
      setReady(true);
      return;
    }
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
      .select('property_id, role, unit_no, unit_id')
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
      unitNo: (list.find((r) => r.property_id === propertyId)?.unit_no as string | null | undefined) ?? null,
      unitId: (list.find((r) => r.property_id === propertyId)?.unit_id as string | null | undefined) ?? null,
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
      // Prefer table read over RPC `property_has_management_staff` (avoids 404 when RPC not deployed).
      // Semantics mirror the SQL function: any active staff role on this property.
      const { data: staffRows, error: staffQErr } = await supabase
        .from('property_members')
        .select('user_id')
        .eq('property_id', chosen)
        .eq('status', 'active')
        .in('role', ['admin', 'council', 'manager', 'property_admin'])
        .limit(1);
      if (staffQErr) {
        if (import.meta.env.DEV) {
          console.warn('[property] staff presence query (replaces property_has_management_staff)', staffQErr);
        }
        setPropertyHasManagementStaff(null);
      } else {
        setPropertyHasManagementStaff((staffRows?.length ?? 0) > 0);
      }
    } else {
      setPropertyHasManagementStaff(null);
    }

    setReady(true);
  }, [user?.id]);

  useLayoutEffect(() => {
    const pathDemo = location.pathname.startsWith('/demo-property');
    const queryDemo = searchParams.get('mode') === 'demo';
    const demoPropertyMock = pathDemo || queryDemo;
    isDemoPropertyMockRef.current = demoPropertyMock;
    setIsDemoPropertyMock(demoPropertyMock);
    if (demoPropertyMock) {
      setMemberships([
        {
          propertyId: DEMO_PROPERTY_MOCK_ID,
          name: '演示楼（Demo Property）',
          role: 'property_admin',
        },
      ]);
      setCurrentPropertyIdState(DEMO_PROPERTY_MOCK_ID);
      setIsDemoMode(false);
      setIsGuest(false);
      setGuestPropertyCodeState(null);
      setNeedsPropertyChoice(false);
      setPropertyHasManagementStaff(true);
      setReady(true);
    }
  }, [location.pathname, location.hash, searchParams]);

  useEffect(() => {
    if (location.pathname.startsWith('/demo-property') || searchParams.get('mode') === 'demo') {
      return;
    }

    /** Auth-only routes: do not load memberships or sync propertyId (avoids meeting/property 400s during recovery). */
    if (location.pathname === '/reset-password' || location.pathname === '/login') {
      setIsDemoMode(false);
      setGuestPropertyCodeState(null);
      setMemberships([]);
      setCurrentPropertyIdState(null);
      setNeedsPropertyChoice(false);
      setIsGuest(false);
      setPropertyHasManagementStaff(null);
      setReady(true);
      return;
    }

    if (authLoading) {
      setReady(false);
      return;
    }

    if (shouldDeferAutoPropertyRedirects()) {
      setReady(false);
      return;
    }

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
  }, [authLoading, session, loadMemberships, guestQuery, location.pathname, location.hash, searchParams]);

  /** URL 含有效 propertyId 且与 state 不一致时，以 URL 为准（扫码 / 前进后退 / 分享链接）。 */
  useEffect(() => {
    if (
      location.pathname === '/reset-password' ||
      location.pathname === '/login' ||
      location.pathname === '/entry'
    ) return;
    if (shouldDeferAutoPropertyRedirects()) return;
    if (!ready || memberships.length === 0 || isDemoMode || isDemoPropertyMock) return;
    const urlPid = getPropertyIdFromUrl(searchParams);
    if (!urlPid) return;
    const urlHit = memberships.find((m) => samePropertyId(m.propertyId, urlPid));
    if (!urlHit) return;
    setCurrentPropertyIdState((prev) => {
      if (samePropertyId(urlHit.propertyId, prev)) return prev;
      persistPropertyId(urlHit.propertyId);
      return urlHit.propertyId;
    });
  }, [location.pathname, location.hash, searchParams, memberships, ready, isDemoMode, isDemoPropertyMock]);

  /** current 不在 memberships 内时：仅单物业时回退到唯一物业；多物业未选择时不自动指定。 */
  useEffect(() => {
    if (location.pathname === '/reset-password' || location.pathname === '/login') return;
    if (shouldDeferAutoPropertyRedirects()) return;
    if (!ready || memberships.length === 0 || isDemoMode || isDemoPropertyMock) return;
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
  }, [
    location.pathname,
    location.hash,
    memberships,
    ready,
    currentPropertyId,
    isDemoMode,
    isDemoPropertyMock,
  ]);

  /** 缺失或无效 URL 时，把当前物业写回 query（与 state 对齐）。 */
  useEffect(() => {
    if (
      location.pathname === '/reset-password' ||
      location.pathname === '/login' ||
      location.pathname === '/entry'
    ) return;
    if (shouldDeferAutoPropertyRedirects()) return;
    if (!ready || !currentPropertyId || memberships.length === 0 || isDemoMode || isDemoPropertyMock) return;
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
      { replace: true, state: location.state },
    );
  }, [
    location.pathname,
    location.hash,
    location.state,
    ready,
    currentPropertyId,
    memberships,
    searchParams,
    setSearchParams,
    isDemoMode,
    isDemoPropertyMock,
  ]);

  const setCurrentPropertyId = useCallback(
    (id: string) => {
      if (
        !isDemoPropertyMockRef.current &&
        !isDemoMode &&
        !memberships.some((m) => samePropertyId(m.propertyId, id))
      ) {
        return;
      }
      setCurrentPropertyIdState(id);
      setNeedsPropertyChoice(false);
      if (isDemoPropertyMockRef.current) return;
      persistPropertyId(id);
      if (isDemoMode) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('propertyId', id);
          return next;
        },
        { replace: true, state: location.state },
      );
    },
    [setSearchParams, isDemoMode, memberships, location.state],
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
      isDemoPropertyMock,
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
      isDemoPropertyMock,
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
