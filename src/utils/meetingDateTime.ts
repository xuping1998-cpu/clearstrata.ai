/** Local wall clock from date + time inputs → ISO for timestamptz columns */
export function localDateTimeToIso(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  const [hh, mm] = (timeStr || '00:00').split(':').map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, d, hh || 0, mm || 0, 0, 0).toISOString();
}
