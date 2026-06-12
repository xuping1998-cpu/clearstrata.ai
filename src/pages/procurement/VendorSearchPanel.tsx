import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Phone, ExternalLink, Search, RefreshCw, Loader2, MapPin, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProperty } from '../../contexts/PropertyContext';
import { callSearchQuotes } from '../../lib/procurement/callSearchQuotes';
import { buildSearchQuoteContext } from '../../lib/procurement/buildQuoteContext';
import {
  formatVendorPriceExclGst,
  formatVendorPriceInclGst,
} from '../../lib/procurement/formatVendorPriceDisplay';
import { saveVendorSearchResults } from '../../lib/procurement/saveVendorSearchResults';
import { isVendorSearchInflight } from '../../lib/procurement/newJobPdfAutoFlow';

interface SearchedVendor {
  company_name: string;
  phone: string;
  website: string;
  address: string;
  description_en: string;
  description_zh: string;
  price_reference?: string;
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_unit?: string | null;
  price_source_url?: string | null;
  price_confidence?: string | null;
  price_evidence_note?: string | null;
}

interface SavedVendor extends SearchedVendor {
  id: string;
  searched_at: string;
}

interface VendorSearchPanelProps {
  jobId: string;
  propertyId: string;
  jobTitle: string;
  jobDescription: string;
  category?: string;
  language: string;
  autoSearchOnEmpty?: boolean;
  /** Gate from quote interpretation consistency; false blocks market comparison. */
  canSearch?: boolean;
}

/**
 * Map raw Edge/Anthropic errors to a friendly, user-facing message.
 * Rate-limit / token-overflow errors must never surface the raw API text.
 * The original error is still logged to the console for debugging.
 */
function toFriendlySearchError(rawError: string | undefined, langEn: boolean): string {
  const raw = (rawError ?? '').toLowerCase();
  const isBusy =
    raw.includes('rate limit') ||
    raw.includes('rate_limit') ||
    raw.includes('input tokens') ||
    raw.includes('tokens per minute') ||
    raw.includes('429') ||
    raw.includes('overloaded');

  if (isBusy) {
    if (rawError) console.warn('SEARCH_QUOTES_RATE_LIMIT', rawError);
    return langEn
      ? 'AI search is temporarily busy. Please try again later. The quote interpretation has been saved and your procurement record is not affected.'
      : 'AI 搜索暂时繁忙，请稍后重试。报价解读已保存，不影响采购资料归档。';
  }

  return rawError || (langEn ? 'Search failed' : '搜索失败');
}

function hasPublicPriceEvidence(v: {
  price_low?: number | null;
  price_high?: number | null;
  price_source_url?: string | null;
}): boolean {
  return (
    v.price_low != null &&
    v.price_high != null &&
    Boolean(v.price_source_url?.trim())
  );
}

function formatVendorPriceRange(v: {
  price_low?: number | null;
  price_high?: number | null;
  price_currency?: string | null;
  price_unit?: string | null;
}): string | null {
  if (v.price_low == null || v.price_high == null) return null;
  const cur = v.price_currency || 'CAD';
  const range = `${cur} $${Number(v.price_low).toLocaleString()} – $${Number(v.price_high).toLocaleString()}`;
  const unit = typeof v.price_unit === 'string' ? v.price_unit.trim() : '';
  return unit ? `${range} (${unit})` : range;
}

export function VendorSearchPanel({
  jobId,
  propertyId,
  jobTitle,
  jobDescription,
  category,
  language,
  autoSearchOnEmpty = false,
  canSearch = true,
}: VendorSearchPanelProps) {
  const { currentPropertyId } = useProperty();
  const l = language === 'en';
  const scopedPropertyId = currentPropertyId ?? propertyId;
  const [vendors, setVendors] = useState<SavedVendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const autoSearchAttemptedRef = useRef(false);

  const hasSavedResults = vendors.length > 0;
  const searchedAt = hasSavedResults ? vendors[0].searched_at : null;

  const loadSavedResults = useCallback(async () => {
    setInitialLoading(true);
    try {
      if (!scopedPropertyId) {
        setVendors([]);
        return;
      }
      const { data } = await supabase
        .from('vendor_search_results')
        .select('*')
        .eq('property_id', scopedPropertyId)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        setVendors(data as SavedVendor[]);
      } else {
        setVendors([]);
      }
    } finally {
      setInitialLoading(false);
    }
  }, [jobId, scopedPropertyId]);

  useEffect(() => {
    autoSearchAttemptedRef.current = false;
    void loadSavedResults();
  }, [loadSavedResults]);

  const saveResults = useCallback(async (newVendors: SearchedVendor[]) => {
    if (!scopedPropertyId) return;
    const { count, error: saveError } = await saveVendorSearchResults({
      propertyId: scopedPropertyId,
      jobId,
      vendors: newVendors,
    });

    if (saveError) {
      console.error('SAVE_VENDOR_SEARCH_RESULTS_ERROR', saveError);
      setError(
        l
          ? 'Failed to save vendor search results. Please check the console.'
          : '供应商搜索结果保存失败，请查看控制台',
      );
      return;
    }

    const { data } = await supabase
      .from('vendor_search_results')
      .select('*')
      .eq('property_id', scopedPropertyId)
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setVendors(data as SavedVendor[]);
    } else if (count > 0) {
      await loadSavedResults();
    }
  }, [scopedPropertyId, jobId, l, loadSavedResults]);

  const searchVendors = useCallback(async () => {
    if (!scopedPropertyId) {
      setError(l ? 'No property selected.' : '未选择物业。');
      return;
    }
    setLoading(true);
    setError('');
    setShowConfirm(false);
    try {
      const { data: photos } = await supabase
        .from('procurement_photos')
        .select('photo_url')
        .eq('job_id', jobId)
        .eq('photo_type', 'request');

      const attachmentUrls = (photos ?? [])
        .map((p) => p.photo_url)
        .filter((u): u is string => Boolean(u));

      // Prefer the compressed, structured quote context over the heavy PDF attachment.
      // Sending the full PDF multimodally is what overflows Claude's input token budget.
      const { data: jobRow } = await supabase
        .from('procurement_jobs')
        .select('parsed_quote_json')
        .eq('id', jobId)
        .maybeSingle();

      const parsedQuoteJson = (jobRow?.parsed_quote_json ?? null) as
        | Record<string, unknown>
        | null;
      const quoteContext = parsedQuoteJson ? buildSearchQuoteContext(parsedQuoteJson) : '';

      const pqCategory =
        parsedQuoteJson && typeof parsedQuoteJson.category === 'string'
          ? parsedQuoteJson.category
          : '';
      const pqCurrentPrice =
        parsedQuoteJson &&
        (typeof parsedQuoteJson.currentPrice === 'string'
          ? parsedQuoteJson.currentPrice
          : parsedQuoteJson.total_amount != null
            ? String(parsedQuoteJson.total_amount)
            : '');

      const json = await callSearchQuotes({
        property_id: scopedPropertyId,
        job_id: jobId,
        title: jobTitle,
        description: jobDescription,
        category: category || pqCategory || undefined,
        current_price: pqCurrentPrice || undefined,
        // When we have a structured quote_context, skip the raw PDF to avoid token overflow.
        attachment_urls:
          quoteContext || attachmentUrls.length === 0 ? undefined : attachmentUrls,
        quote_context: quoteContext || undefined,
      });
      const found = Array.isArray(json?.vendors) ? json.vendors : [];

      console.log('SEARCH_QUOTES_RAW_RESPONSE', json);
      console.log('SEARCH_QUOTES_VENDOR_COUNT', found.length);

      if (!json?.success) {
        setError(toFriendlySearchError(json?.error, l));
        return;
      }

      if (found.length === 0) {
        setError(l ? 'No comparable suppliers with public pricing found' : '未找到符合条件的公开报价供应商');
        return;
      }

      await saveResults(found);
    } catch {
      setError(l ? 'Network error' : '网络错误');
    } finally {
      setLoading(false);
    }
  }, [scopedPropertyId, jobId, jobTitle, jobDescription, l, saveResults]);

  useEffect(() => {
    if (!autoSearchOnEmpty || initialLoading || loading) return;
    if (!canSearch) return;
    if (autoSearchAttemptedRef.current || hasSavedResults) return;

    const hasDescription = Boolean(jobDescription?.trim());
    const hasCategory = Boolean(category?.trim());
    if (!hasDescription && !hasCategory) return;

    autoSearchAttemptedRef.current = true;

    if (isVendorSearchInflight(jobId)) {
      let attempts = 0;
      const poll = window.setInterval(() => {
        attempts += 1;
        void loadSavedResults();
        if (attempts >= 60) window.clearInterval(poll);
      }, 2000);
      return () => window.clearInterval(poll);
    }

    void searchVendors();
  }, [
    autoSearchOnEmpty,
    canSearch,
    initialLoading,
    loading,
    hasSavedResults,
    jobDescription,
    category,
    searchVendors,
    jobId,
    loadSavedResults,
  ]);

  const handleResearch = () => {
    if (hasSavedResults) {
      setShowConfirm(true);
    } else {
      searchVendors();
    }
  };

  const formatSearchDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (l) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (initialLoading) {
    return (
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-sky-600">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm">{l ? 'Loading saved results...' : '加载已保存的结果...'}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-sky-700">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm font-medium">
            {l ? 'AI is searching for real Vancouver vendors...' : 'AI 正在搜索温哥华真实供应商...'}
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (!hasSavedResults) {
    return (
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-sky-600" size={18} />
            <span className="text-sm font-semibold text-sky-900">
              {l ? 'AI Vendor Search' : 'AI供应商实时搜索'}
            </span>
          </div>
          <button
            onClick={searchVendors}
            disabled={!canSearch}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              canSearch
                ? 'bg-sky-600 text-white hover:bg-sky-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Search size={13} />
            {canSearch
              ? l ? 'Search Vancouver Vendors' : '搜索温哥华供应商'
              : l ? 'Confirm quote interpretation first' : '请先确认报价解读'}
          </button>
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5 mt-3 border border-red-200">
            {error}
          </div>
        )}
        <p className="text-xs text-sky-700/70 mt-1.5">
          {!canSearch
            ? l
              ? 'Please confirm the current vendor and service scope before running market comparison.'
              : '需确认当前供应商与工作范围后，才能进行市场比较。'
            : l
              ? 'AI will search the web in real-time for local Vancouver vendors matching this job. Results are saved for future reference.'
              : 'AI将实时搜索温哥华本地匹配此工单的供应商。搜索结果会自动保存，下次打开无需重新搜索。'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Globe className="text-sky-600" size={18} />
          <span className="text-sm font-semibold text-sky-900">
            {l ? 'AI Vendor Search Results' : 'AI供应商搜索结果'}
          </span>
          <span className="text-xs text-sky-600/70">
            ({l ? `${vendors.length} found` : `找到${vendors.length}家`})
          </span>
          {searchedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-sky-600/60 bg-sky-100/60 px-2 py-0.5 rounded-full">
              <Calendar size={10} />
              {l ? `Searched on ${formatSearchDate(searchedAt)}` : `搜索于${formatSearchDate(searchedAt)}`}
            </span>
          )}
        </div>
        <button
          onClick={handleResearch}
          className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 transition-colors px-2 py-1 rounded hover:bg-sky-100 shrink-0"
        >
          <RefreshCw size={12} />
          {l ? 'Re-search' : '重新搜索'}
        </button>
      </div>

      {showConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <p className="text-sm text-amber-800 mb-2">
            {l
              ? 'Re-searching will replace the currently saved vendor list. Are you sure?'
              : '重新搜索将替换当前保存的供应商列表，确认吗？'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={searchVendors}
              className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              {l ? 'Confirm Re-search' : '确认重新搜索'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {l ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2.5 mb-3 border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white rounded-lg p-3 border border-sky-200/60 hover:border-sky-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{v.company_name}</span>
                  {hasPublicPriceEvidence(v) && formatVendorPriceRange(v) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {formatVendorPriceRange(v)}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-1.5">
                  {v.phone && (
                    <a href={`tel:${v.phone}`} className="flex items-center gap-1 hover:text-sky-600 transition-colors">
                      <Phone size={11} className="text-gray-400" />
                      {v.phone}
                    </a>
                  )}
                  {v.website && (
                    <a
                      href={v.website.startsWith('http') ? v.website : `https://${v.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-sky-600 transition-colors truncate max-w-[200px]"
                    >
                      <ExternalLink size={11} className="text-gray-400 shrink-0" />
                      {v.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                  {v.address && (
                    <span className="flex items-center gap-1 truncate max-w-[250px]">
                      <MapPin size={11} className="text-gray-400 shrink-0" />
                      {v.address}
                    </span>
                  )}
                </div>

                {hasPublicPriceEvidence(v) && formatVendorPriceExclGst(v) && (
                  <p className="text-xs font-medium text-emerald-800 mb-0.5">
                    {l ? 'Reference (excl. tax): ' : '参考报价（不含税）：'}
                    {formatVendorPriceExclGst(v)}
                  </p>
                )}
                {hasPublicPriceEvidence(v) && formatVendorPriceInclGst(v) && (
                  <p className="text-xs text-emerald-700/90 mb-1.5">
                    {l ? 'Incl. GST: ' : '含税总价：'}
                    {formatVendorPriceInclGst(v)}
                  </p>
                )}

                <p className="text-xs text-gray-600 leading-relaxed">
                  {l ? v.description_en : (v.description_zh || v.description_en)}
                </p>

                {(() => {
                  const whyComparable =
                    v.price_evidence_note?.trim() ||
                    (l ? v.description_en : v.description_zh || v.description_en)?.trim() ||
                    '';
                  if (!whyComparable) return null;
                  return (
                    <div className="mt-1.5 rounded-md border border-sky-100 bg-sky-50/60 px-2 py-1.5">
                      <p className="text-[11px] font-medium text-sky-700 mb-0.5">
                        {l ? 'Why comparable' : '可比原因'}
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed break-words">
                        {whyComparable}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-sky-600/50 mt-2.5 text-center">
        {l
          ? 'Results saved automatically. Click "Re-search" to update with fresh results.'
          : '搜索结果已自动保存。点击"重新搜索"可更新为最新结果。'}
      </p>
    </div>
  );
}
