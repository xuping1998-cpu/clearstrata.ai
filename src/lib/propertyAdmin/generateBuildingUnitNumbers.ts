/**
 * 根据楼层规则生成整栋楼房号，供导出 Excel/CSV 或写入 unit_whitelist。
 */

export type BuildingUnitNumberFormat = 'concat2' | 'floorTimes100';

export type GenerateBuildingUnitsParams = {
  startFloor: number;
  endFloor: number;
  unitsPerFloor: number;
  /** 2 位尾号：楼层 + 两位户号，如 3 层第 4 户 → 304 */
  format: BuildingUnitNumberFormat;
  /** 每层第一个户号（含），如 1 表示 01、02… */
  startUnitPerFloor: number;
  /** 逗号分隔楼层，如 "4,13"；空表示不排除 */
  excludedFloorsRaw: string;
};

export function parseExcludedFloors(raw: string): { ok: true; floors: Set<number> } | { ok: false; message: string } {
  const t = raw.trim();
  if (!t) return { ok: true, floors: new Set() };
  const parts = t.split(/[,，\s]+/).filter(Boolean);
  const floors = new Set<number>();
  for (const p of parts) {
    const seg = p.trim();
    if (!seg) continue;
    if (!/^-?\d+$/.test(seg)) {
      return { ok: false, message: '排除楼层格式错误' };
    }
    floors.add(Number.parseInt(seg, 10));
  }
  return { ok: true, floors };
}

/** 返回中文错误文案，null 表示通过 */
export function validateBuildingUnitParams(p: GenerateBuildingUnitsParams): string | null {
  if (!Number.isFinite(p.startFloor) || !Number.isFinite(p.endFloor)) {
    return '楼层请输入有效数字';
  }
  if (p.startFloor > p.endFloor) {
    return '起始楼层不能大于结束楼层';
  }
  if (!Number.isFinite(p.unitsPerFloor) || p.unitsPerFloor <= 0) {
    return '每层户数必须大于 0';
  }
  if (!Number.isFinite(p.startUnitPerFloor) || p.startUnitPerFloor < 0) {
    return '每层起始户号不能小于 0';
  }
  const ex = parseExcludedFloors(p.excludedFloorsRaw);
  if (!ex.ok) return ex.message;
  return null;
}

/**
 * 生成房号列表（按楼层、户序稳定排序；同一字符串去重）。
 * - concat2：房号 = `${floor}${String(unitIndex).padStart(2,'0')}`
 * - floorTimes100：房号 = `${floor * 100 + unitIndex}`
 */
export function generateBuildingUnitNumbers(p: GenerateBuildingUnitsParams): string[] {
  const err = validateBuildingUnitParams(p);
  if (err) return [];

  const ex = parseExcludedFloors(p.excludedFloorsRaw);
  if (!ex.ok) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (let floor = p.startFloor; floor <= p.endFloor; floor++) {
    if (ex.floors.has(floor)) continue;
    for (let i = 0; i < p.unitsPerFloor; i++) {
      const unitIndex = p.startUnitPerFloor + i;
      if (unitIndex < 0) continue;

      const token =
        p.format === 'concat2'
          ? `${floor}${String(unitIndex).padStart(2, '0')}`
          : String(floor * 100 + unitIndex);

      const key = token.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(token);
    }
  }

  return out;
}

/** 预览用：是否存在生成结果内部的重复（正常应为 false） */
export function hasInternalDuplicates(units: string[]): boolean {
  const s = new Set<string>();
  for (const u of units) {
    const k = u.trim().toLowerCase();
    if (s.has(k)) return true;
    s.add(k);
  }
  return false;
}
