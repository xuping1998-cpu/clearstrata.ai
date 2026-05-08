import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Loader2, RefreshCw, FileUp, FileText, X, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AiEstimate {
  low: number;
  high: number;
  reasoning: string;
  materialCalc?: string;
}

interface AiPricingPanelProps {
  jobId: string;
  propertyId: string;
  title: string;
  description: string;
  jobType: string;
  category: string;
  estimatedBudget: number;
  language: string;
  aiEstimateLow?: number;
  aiEstimateHigh?: number;
  aiEstimateReasoning?: string;
  aiMaterialCalc?: string;
  onEstimateLoaded?: (low: number, high: number, reasoning: string) => void;
  /** 楼面图等辅助上传：业委会/管理员/物业经理；业主仅查看估价 */
  canUploadSupportingDocs?: boolean;
}

export type TrafficLightResult = {
  color: 'green' | 'yellow' | 'red';
  reason: 'fair' | 'slightly_low' | 'severely_low' | 'slightly_high' | 'severely_high';
};

export function getTrafficLight(
  amount: number,
  low: number,
  high: number
): TrafficLightResult {
  const lowThreshold50 = low * 0.5;
  const highThreshold120 = high * 1.2;
  const highThreshold150 = high * 1.5;

  if (amount < lowThreshold50) return { color: 'red', reason: 'severely_low' };
  if (amount < low) return { color: 'yellow', reason: 'slightly_low' };
  if (amount <= high) return { color: 'green', reason: 'fair' };
  if (amount <= highThreshold120) return { color: 'green', reason: 'fair' };
  if (amount <= highThreshold150) return { color: 'yellow', reason: 'slightly_high' };
  return { color: 'red', reason: 'severely_high' };
}

export function TrafficLightBadge({
  light,
  language,
}: {
  light: TrafficLightResult;
  language: string;
}) {
  const l = language === 'en';

  const labels: Record<TrafficLightResult['reason'], { en: string; zh: string }> = {
    fair: { en: 'Fair Price', zh: '价格合理' },
    slightly_low: { en: 'Verify Scope', zh: '偏低，请确认范围' },
    severely_low: { en: 'Abnormally Low', zh: '严重偏低，请确认范围' },
    slightly_high: { en: 'Slightly High', zh: '略高，建议确认范围' },
    severely_high: { en: 'Overpriced', zh: '严重偏高，建议重新询价' },
  };

  const colorConfig = {
    green: { bg: 'bg-clearstrata-brand-100', text: 'text-clearstrata-brand-800', dot: 'bg-clearstrata-ui-primary' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    red: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  };

  const c = colorConfig[light.color];
  const label = l ? labels[light.reason].en : labels[light.reason].zh;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

async function convertPdfPageToImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AiPricingPanel({
  jobId,
  propertyId,
  title,
  description,
  jobType,
  category,
  estimatedBudget,
  language,
  aiEstimateLow,
  aiEstimateHigh,
  aiEstimateReasoning,
  aiMaterialCalc,
  onEstimateLoaded,
  canUploadSupportingDocs = true,
}: AiPricingPanelProps) {
  const l = language === 'en';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [estimate, setEstimate] = useState<AiEstimate | null>(
    aiEstimateLow && aiEstimateHigh
      ? { low: aiEstimateLow, high: aiEstimateHigh, reasoning: aiEstimateReasoning || '', materialCalc: aiMaterialCalc || undefined }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanText, setFloorPlanText] = useState('');
  const [showCalcDetail, setShowCalcDetail] = useState(false);
  const [showFloorPlanInput, setShowFloorPlanInput] = useState(false);

  useEffect(() => {
    if (!canUploadSupportingDocs) setShowFloorPlanInput(false);
  }, [canUploadSupportingDocs]);

  const fetchEstimate = async (withFloorPlan = false) => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-pricing`;

      let floorPlanBase64: string | undefined;
      let floorPlanTextToSend: string | undefined;

      if (withFloorPlan) {
        if (floorPlanFile) {
          if (floorPlanFile.type.startsWith('image/')) {
            floorPlanBase64 = await convertPdfPageToImage(floorPlanFile);
          } else {
            floorPlanTextToSend = floorPlanText || `[PDF file uploaded: ${floorPlanFile.name}]`;
          }
        }
        if (floorPlanText) {
          floorPlanTextToSend = floorPlanText;
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          job_type: jobType,
          category: category || '',
          estimated_budget: estimatedBudget || 0,
          floor_plan_base64: floorPlanBase64,
          floor_plan_text: floorPlanTextToSend,
          property_id: propertyId,
          job_id: jobId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const est: AiEstimate = {
          low: data.low,
          high: data.high,
          reasoning: data.reasoning,
          materialCalc: data.material_calc || undefined,
        };
        setEstimate(est);

        await supabase
          .from('procurement_jobs')
          .update({
            ai_estimate_low: data.low,
            ai_estimate_high: data.high,
            ai_estimate_reasoning: data.reasoning,
            ai_material_calc: data.material_calc || null,
            floor_plan_text: floorPlanTextToSend || null,
          })
          .eq('property_id', propertyId)
          .eq('id', jobId);

        if (est.materialCalc) {
          setShowCalcDetail(true);
        }

        onEstimateLoaded?.(data.low, data.high, data.reasoning);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch estimate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!estimate && !loading) {
      fetchEstimate(false);
    }
  }, [jobId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFloorPlanFile(file);
  };

  const handleFloorPlanSubmit = () => {
    if (!floorPlanFile && !floorPlanText.trim()) return;
    fetchEstimate(true);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm font-medium">
            {(floorPlanFile || floorPlanText)
              ? (l ? 'AI is analyzing floor plan and calculating materials...' : 'AI 正在分析图纸并计算材料量...')
              : (l ? 'AI is analyzing price range...' : 'AI 正在分析合理价格区间...')}
          </span>
        </div>
      </div>
    );
  }

  if (error && !estimate) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">{l ? 'AI pricing unavailable' : 'AI 估价暂不可用'}</span>
          <button
            onClick={() => fetchEstimate(false)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <RefreshCw size={14} />
            {l ? 'Retry' : '重试'}
          </button>
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={18} />
          <span className="text-sm font-semibold text-blue-900">{l ? 'AI Price Estimate' : 'AI估价参考'}</span>
        </div>
        <div className="flex items-center gap-2">
          {canUploadSupportingDocs && (
            <button
              onClick={() => setShowFloorPlanInput(!showFloorPlanInput)}
              className="text-xs text-clearstrata-brand-600 hover:text-clearstrata-brand-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-clearstrata-ui-soft"
              title={l ? 'Upload floor plan for precise estimate' : '上传楼面图精确估价'}
            >
              <FileUp size={12} />
              {l ? 'Floor Plan' : '楼面图'}
            </button>
          )}
          <button
            onClick={() => fetchEstimate(false)}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            title={l ? 'Refresh estimate' : '刷新估价'}
          >
            <RefreshCw size={12} />
            {l ? 'Refresh' : '刷新'}
          </button>
        </div>
      </div>

      {showFloorPlanInput && (
        <FloorPlanUploadSection
          language={language}
          floorPlanFile={floorPlanFile}
          floorPlanText={floorPlanText}
          onFileChange={handleFileChange}
          onTextChange={setFloorPlanText}
          onSubmit={handleFloorPlanSubmit}
          onClearFile={() => { setFloorPlanFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
          onClose={() => setShowFloorPlanInput(false)}
          fileInputRef={fileInputRef}
        />
      )}

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-blue-700">
          ${estimate.low.toLocaleString()}
        </span>
        <span className="text-gray-500 text-lg">-</span>
        <span className="text-2xl font-bold text-blue-700">
          ${estimate.high.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500 ml-1">CAD</span>
      </div>

      {estimate.reasoning && (
        <p className="text-xs text-blue-800/70 leading-relaxed">{estimate.reasoning}</p>
      )}

      {estimate.materialCalc && (
        <MaterialCalcSection
          materialCalc={estimate.materialCalc}
          language={language}
          showDetail={showCalcDetail}
          onToggle={() => setShowCalcDetail(!showCalcDetail)}
        />
      )}

    </div>
  );
}

function FloorPlanUploadSection({
  language,
  floorPlanFile,
  floorPlanText,
  onFileChange,
  onTextChange,
  onSubmit,
  onClearFile,
  onClose,
  fileInputRef,
}: {
  language: string;
  floorPlanFile: File | null;
  floorPlanText: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onClearFile: () => void;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const l = language === 'en';

  return (
    <div className="mb-3 p-3 bg-white/80 rounded-lg border border-blue-200/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Calculator className="text-clearstrata-brand-600" size={14} />
          <span className="text-xs font-semibold text-gray-700">
            {l ? 'Upload Floor Plan for Precise Material Calculation' : '上传楼面图，AI精确计算材料量'}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <p className="text-[11px] text-gray-500 mb-2.5 leading-relaxed">
        {l
          ? 'Upload a floor plan image (JPG/PNG) or paste area/dimension data. AI will calculate exact material quantities and costs.'
          : '上传楼面图图片（JPG/PNG）或粘贴面积/尺寸数据，AI将精确计算所需材料量和费用。'}
      </p>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">
            {l ? 'Floor Plan Image (JPG/PNG)' : '楼面图图片（JPG/PNG）'}
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-clearstrata-brand-700 bg-clearstrata-ui-soft border border-clearstrata-ui-softBorder rounded-lg hover:bg-clearstrata-brand-100 transition-colors"
            >
              <FileUp size={13} />
              {l ? 'Choose File' : '选择文件'}
            </button>
            {floorPlanFile && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                <FileText size={12} className="text-gray-500" />
                <span className="truncate max-w-[180px]">{floorPlanFile.name}</span>
                <button onClick={onClearFile} className="text-gray-400 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-600 mb-1">
            {l ? 'Or paste area/dimension info' : '或粘贴面积/尺寸信息'}
          </label>
          <textarea
            value={floorPlanText}
            onChange={(e) => onTextChange(e.target.value)}
            rows={3}
            placeholder={l
              ? 'e.g., Lot: 6,200 sq ft, Building footprint: 2,400 sq ft, Garden area: 3,800 sq ft, Driveway: 600 sq ft...'
              : '例如：地块总面积6,200平方英尺，建筑占地2,400平方英尺，花园面积3,800平方英尺，车道600平方英尺...'}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-clearstrata-brand-400 focus:border-transparent resize-none"
          />
        </div>

        <button
          onClick={onSubmit}
          disabled={!floorPlanFile && !floorPlanText.trim()}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-clearstrata-ui-primary text-white rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Calculator size={13} />
          {l ? 'Recalculate with Floor Plan Data' : '结合楼面图重新计算'}
        </button>
      </div>
    </div>
  );
}

function MaterialCalcSection({
  materialCalc,
  language,
  showDetail,
  onToggle,
}: {
  materialCalc: string;
  language: string;
  showDetail: boolean;
  onToggle: () => void;
}) {
  const l = language === 'en';

  return (
    <div className="mt-3 p-3 bg-clearstrata-ui-soft/80 rounded-lg border border-clearstrata-ui-softBorder/80">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-1.5">
          <Calculator className="text-clearstrata-brand-600" size={14} />
          <span className="text-xs font-semibold text-clearstrata-brand-800">
            {l ? 'Material Calculation Details' : '材料量计算明细'}
          </span>
        </div>
        {showDetail
          ? <ChevronUp className="text-clearstrata-brand-600" size={14} />
          : <ChevronDown className="text-clearstrata-brand-600" size={14} />}
      </button>
      {showDetail && (
        <div className="mt-2 pt-2 border-t border-clearstrata-ui-softBorder/60">
          <p className="text-xs text-clearstrata-brand-900/80 leading-relaxed whitespace-pre-line">
            {materialCalc}
          </p>
        </div>
      )}
    </div>
  );
}
