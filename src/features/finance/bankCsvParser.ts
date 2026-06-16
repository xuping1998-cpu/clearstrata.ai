/**
 * Bank CSV parser — Phase 1A (RBC generic CSV).
 * Output normalized rows for bank_transactions insert.
 */

export type NormalizedBankRow = {
  transaction_date: string;
  description: string;
  amount: number;
  reference_number: string | null;
  balance: number | null;
  source_bank: string;
};

export type ParseBankCsvSuccess = {
  ok: true;
  rows: NormalizedBankRow[];
  source_bank: string;
  parseErrors: string[];
};

export type ParseBankCsvFailure = {
  ok: false;
  error: string;
};

export type ParseBankCsvResult = ParseBankCsvSuccess | ParseBankCsvFailure;

/** Parse a single CSV text blob. */
export function parseBankCsv(csvText: string): ParseBankCsvResult {
  const trimmed = csvText.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return { ok: false, error: '暂不支持此 CSV 格式' };
  }

  const table = parseCsvTable(trimmed);
  if (table.length < 2) {
    return { ok: false, error: '暂不支持此 CSV 格式' };
  }

  const headers = table[0].map((h) => h.trim());
  const bank = detectBankFormat(headers);
  if (!bank) {
    return { ok: false, error: '暂不支持此 CSV 格式' };
  }

  const col = mapColumns(headers, bank);
  if (!col) {
    return { ok: false, error: '暂不支持此 CSV 格式' };
  }

  const rows: NormalizedBankRow[] = [];
  const parseErrors: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    if (cells.every((c) => !c.trim())) continue;

    try {
      const dateRaw = getCell(cells, col.date);
      const descRaw = getCell(cells, col.description);
      const amountRaw = getCell(cells, col.amount);
      const balanceRaw = col.balance >= 0 ? getCell(cells, col.balance) : '';

      const transaction_date = parseDateToIso(dateRaw);
      const description = descRaw.trim();
      const amount = parseAmount(amountRaw);
      const balance = balanceRaw.trim() ? parseAmount(balanceRaw) : null;

      if (!transaction_date || !description) {
        parseErrors.push(`Row ${i + 1}: missing date or description`);
        continue;
      }
      if (!Number.isFinite(amount)) {
        parseErrors.push(`Row ${i + 1}: invalid amount`);
        continue;
      }

      rows.push({
        transaction_date,
        description,
        amount,
        reference_number: col.reference >= 0 ? getCell(cells, col.reference).trim() || null : null,
        balance: balance != null && Number.isFinite(balance) ? balance : null,
        source_bank: bank,
      });
    } catch {
      parseErrors.push(`Row ${i + 1}: parse error`);
    }
  }

  if (rows.length === 0 && parseErrors.length > 0) {
    return { ok: false, error: parseErrors[0] ?? '暂不支持此 CSV 格式' };
  }

  return { ok: true, rows, source_bank: bank, parseErrors };
}

type ColumnMap = {
  date: number;
  description: number;
  amount: number;
  balance: number;
  reference: number;
};

function detectBankFormat(headers: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  const hasDate = lower.some((h) => h === 'date' || h === 'transaction date' || h.startsWith('date'));
  const hasDesc = lower.some((h) => h === 'description' || h === 'details' || h.includes('description'));
  const hasAmount = lower.some((h) => h === 'amount' || h === 'cad$' || h.includes('amount'));

  if (hasDate && hasDesc && hasAmount) {
    return 'RBC';
  }
  return null;
}

function mapColumns(headers: string[], _bank: string): ColumnMap | null {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());

  const date = lower.findIndex((h) => h === 'date' || h === 'transaction date' || h.startsWith('date'));
  const description = lower.findIndex(
    (h) => h === 'description' || h === 'details' || h.includes('description'),
  );
  const amount = lower.findIndex((h) => h === 'amount' || h === 'cad$' || h.includes('amount'));
  const balance = lower.findIndex((h) => h === 'balance' || h.includes('balance'));
  const reference = lower.findIndex(
    (h) => h === 'reference' || h === 'reference number' || h.includes('reference'),
  );

  if (date < 0 || description < 0 || amount < 0) return null;

  return {
    date,
    description,
    amount,
    balance,
    reference,
  };
}

function getCell(cells: string[], idx: number): string {
  return idx >= 0 && idx < cells.length ? cells[idx] : '';
}

/** Minimal RFC-style CSV row parser (handles quoted commas). */
function parseCsvTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      if (ch === '\r') i++;
    } else if (ch !== '\r') {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);

  return rows;
}

function parseDateToIso(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    let y = parseInt(slash[3], 10);
    if (y < 100) y += 2000;
    // RBC Canada: typically MM/DD/YYYY
    const month = a <= 12 ? a : b;
    const day = a <= 12 ? b : a;
    const d = new Date(Date.UTC(y, month - 1, day));
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parseAmount(raw: string): number {
  let s = raw.trim();
  if (!s) return NaN;

  let negative = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negative = true;
    s = s.slice(1, -1);
  }

  s = s.replace(/[CAD$,\s]/gi, '');
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -Math.abs(n) : n;
}
