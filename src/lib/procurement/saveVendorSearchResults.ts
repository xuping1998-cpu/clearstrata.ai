import { supabase } from '../supabase';

export type VendorSearchResultRow = {
  company_name: string;
  phone?: string;
  website?: string;
  address?: string;
  description_en?: string;
  description_zh?: string;
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_unit?: string | null;
  price_source_url?: string | null;
  price_confidence?: string | null;
  price_evidence_note?: string | null;
};

export async function saveVendorSearchResults(params: {
  propertyId: string;
  jobId: string;
  vendors: VendorSearchResultRow[];
}): Promise<{ count: number; error: { message: string } | null }> {
  const { propertyId, jobId, vendors } = params;

  console.log('SAVE_VENDOR_RESULTS_START', {
    jobId,
    propertyId,
    vendorCount: vendors.length,
  });

  if (!propertyId || !jobId || vendors.length === 0) {
    return { count: 0, error: { message: 'Missing propertyId, jobId, or vendors' } };
  }

  const searchedAt = new Date().toISOString();
  const rows = vendors.map((v) => ({
    property_id: propertyId,
    job_id: jobId,
    company_name: v.company_name,
    phone: v.phone || '',
    website: v.website || '',
    address: v.address || '',
    description_en: v.description_en || '',
    description_zh: v.description_zh || '',
    price_reference: '',
    price_low: v.price_low ?? null,
    price_high: v.price_high ?? null,
    price_currency: v.price_currency || 'CAD',
    price_unit: v.price_unit || null,
    price_source_url: v.price_source_url || null,
    price_confidence: v.price_confidence || null,
    price_evidence_note: v.price_evidence_note || null,
    searched_at: searchedAt,
  }));

  console.log('SAVE_VENDOR_RESULTS_PAYLOAD', { jobId, propertyId, rows });

  const { error: deleteError } = await supabase
    .from('vendor_search_results')
    .delete()
    .eq('property_id', propertyId)
    .eq('job_id', jobId);

  if (deleteError) {
    console.error('SAVE_VENDOR_RESULTS_ERROR', deleteError);
    console.error('SAVE_VENDOR_SEARCH_RESULTS_ERROR', deleteError);
    return { count: 0, error: { message: deleteError.message } };
  }

  const { data, error: insertError } = await supabase
    .from('vendor_search_results')
    .insert(rows)
    .select('id');

  if (insertError) {
    console.error('SAVE_VENDOR_RESULTS_ERROR', insertError);
    console.error('SAVE_VENDOR_SEARCH_RESULTS_ERROR', insertError);
    return { count: 0, error: { message: insertError.message } };
  }

  const count = data?.length ?? rows.length;
  console.log('SAVE_VENDOR_RESULTS_SUCCESS', { jobId, propertyId, count });
  return { count, error: null };
}
