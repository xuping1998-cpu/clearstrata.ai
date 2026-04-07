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
import { useSearchParams } from 'react-router-dom';
import { supabase, type UserRole } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { samePropertyId } from '../lib/propertyIdMatch';

/** Primary storage key (existing installs). */
const STORAGE_KEY = 'clearstrata-current-property-id';
/** Optional alias for compatibility with docs / external tooling. */
const LEGACY_STORAGE_KEY = 'currentPropertyId';

function readStoredPropertyId(): string | null {
  try {
    const primary = localStorage.getItem(STORAGE_KEY);
    if (primary) return primary;
    return localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
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

/** URL > localStorage > (single membership only) first property; IDs normalized via membership rows. */
function resolvePropertyIdFromSources(
  mems: PropertyMembership[],
  searchParams: URLSearchParams,
): string | null {
  if (mems.length === 0) return null;

  const urlPid = searchParams.get('propertyId');
  const urlHit = urlPid ? mems.find((m) => samePropertyId(m.propertyId, urlPid)) : null;
  if (urlHit) return urlHit.propertyId;

  const saved = readStoredPropertyId();
  const savedHit = saved ? mems.find((m) => samePropertyId(m.propertyId, saved)) : null;
  if (savedHit) return savedHit.propertyId;

  if (mems.length === 1) return mems[0].propertyId;

  return null;
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
}

const PropertyContext = createContext<PropertyContextValue | undefined>(undefined);

export function PropertyProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const [ready, setReady] = useState(!session);
  const [memberships, setMemberships] = useState<PropertyMembership[]>([]);
  const [currentPropertyId, setCurrentPropertyIdState] = useState<string | null>(null);
  const [needsPropertyChoice, setNeedsPropertyChoice] = useState(false);

  const loadMemberships = useCallback(async () => {
    if (!user?.id) {
      setMemberships([]);
      setCurrentPropertyIdState(null);
      setNeedsPropertyChoice(false);
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

    if (mems.length === 0) {
      setCurrentPropertyIdState(null);
      setNeedsPropertyChoice(false);
      setReady(true);
      return;
    }

    const chosen = resolvePropertyIdFromSources(mems, searchParamsRef.current);
    setCurrentPropertyIdState(chosen);
    setNeedsPropertyChoice(mems.length > 1 && chosen == null);
    if (chosen) {
      persistPropertyId(chosen);
    }
    setReady(true);
  }, [user?.id]);

  useEffect(() => {
    if (!session) {
      setMemberships([]);
      setCurrentPropertyIdState(null);
      setNeedsPropertyChoice(false);
      setReady(true);
      return;
    }
    setReady(false);
    void loadMemberships();
  }, [session, loadMemberships]);

  /** URL 含有效 propertyId 且与 state 不一致时，以 URL 为准（前进/后退/分享链接）。 */
  useEffect(() => {
    if (!ready || memberships.length === 0) return;
    const urlPid = searchParams.get('propertyId');
    if (!urlPid) return;
    const urlHit = memberships.find((m) => samePropertyId(m.propertyId, urlPid));
    if (!urlHit) return;
    setCurrentPropertyIdState((prev) => {
      if (samePropertyId(urlHit.propertyId, prev)) return prev;
      persistPropertyId(urlHit.propertyId);
      return urlHit.propertyId;
    });
  }, [searchParams, memberships, ready]);

  /** current 不在 memberships 内时：仅单物业时回退到唯一物业；多物业未选择时不自动指定。 */
  useEffect(() => {
    if (!ready || memberships.length === 0) return;
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
  }, [memberships, ready, currentPropertyId]);

  /** 缺失或无效 URL 时，把当前物业写回 query（与 state 对齐）。 */
  useEffect(() => {
    if (!ready || !currentPropertyId || memberships.length === 0) return;
    const urlPid = searchParams.get('propertyId');
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
  }, [ready, currentPropertyId, memberships, searchParams, setSearchParams]);

  const setCurrentPropertyId = useCallback(
    (id: string) => {
      setCurrentPropertyIdState(id);
      setNeedsPropertyChoice(false);
      persistPropertyId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('propertyId', id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
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
    }),
    [
      ready,
      memberships,
      currentPropertyId,
      roleInProperty,
      setCurrentPropertyId,
      needsPropertyChoice,
      loadMemberships,
    ],
  );

  return <PropertyContext.Provider value={value}>{children}</PropertyContext.Provider>;
}

export function useProperty() {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider');
  return ctx;
}
