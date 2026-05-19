export type ProcurementQuoteAnalysis = {
  category: string;
  description: string;
  currentPrice: string;
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export async function analyzeProcurementQuoteFromFile(
  file: File,
): Promise<ProcurementQuoteAnalysis> {
  const fileBase64 = await readFileAsBase64(file);
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-procurement-quote`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64,
      mimeType: file.type || 'application/pdf',
      filename: file.name || 'quote.pdf',
    }),
  });

  const json = await response.json();
  console.log('ANALYZE_PROCUREMENT_QUOTE_RESPONSE', json);

  if (!response.ok || json?.success === false) {
    throw new Error(json?.error || `Analyze failed (${response.status})`);
  }

  return {
    category: String(json.category ?? '').trim(),
    description: String(json.description ?? '').trim(),
    currentPrice: String(json.currentPrice ?? '').trim(),
  };
}
