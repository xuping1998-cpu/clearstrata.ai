export type VendorSignalType =
  | 'price_outlier_persistent'
  | 'vendor_concentration_high'
  | 'quote_competition_weak'
  | 'relationship_risk_pattern';

export type HardSignalCandidate = {
  vendor_name: string;
  signal_type: VendorSignalType;
  evidence_json: Record<string, unknown>;
  /** 0–100 provisional score from hard rules (AI may adjust). */
  provisional_risk_score: number;
};

export type VendorRiskSignalRow = {
  id: string;
  property_id: string;
  vendor_name: string;
  signal_type: VendorSignalType;
  risk_level: string;
  risk_score: number;
  summary_zh: string;
  summary_en: string;
  evidence_json: Record<string, unknown>;
  ai_reasons: unknown[];
  ai_recommendations: unknown[];
  status: string;
  created_at: string;
  updated_at: string;
};
