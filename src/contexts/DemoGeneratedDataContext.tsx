import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { generateDemoData, type GeneratedDemoData } from '@/lib/demoProperty/generateDemoData';
import { buildDemoGenerationSeed } from '@/lib/demoProperty/demoStorage';

const DemoGeneratedDataContext = createContext<GeneratedDemoData | null>(null);

/**
 * 包裹在 `isDemoPropertyMock` 的 Layout 子树内，为演示页提供同一份确定性生成数据。
 */
export function DemoGeneratedDataProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const urlSeed = searchParams.get('seed');

  const data = useMemo(
    () =>
      generateDemoData({
        seed: buildDemoGenerationSeed({ urlSeed }),
        unitCount: 48,
      }),
    [urlSeed, location.key],
  );

  return <DemoGeneratedDataContext.Provider value={data}>{children}</DemoGeneratedDataContext.Provider>;
}

export function useDemoGeneratedData(): GeneratedDemoData {
  const ctx = useContext(DemoGeneratedDataContext);
  if (!ctx) {
    throw new Error('useDemoGeneratedData must be used within DemoGeneratedDataProvider');
  }
  return ctx;
}

/** 在 Provider 外（如 overview）按需生成，不抛错 */
export function useDemoGeneratedDataOptional(): GeneratedDemoData | null {
  return useContext(DemoGeneratedDataContext);
}
