/**
 * Service category buckets (Phase 2A.5).
 *
 * Coarse buckets so that closely related trades (e.g. mechanical / plumbing /
 * DHW / piping) are treated as the same scope for consistency checks, avoiding
 * false category mismatches. Matching is trim + lowercase + substring.
 */

const BUCKET_ALIASES: Record<string, string[]> = {
  building_mechanical: [
    'mechanical',
    'plumbing',
    'hvac',
    'heating',
    'cooling',
    'boiler',
    'gas',
    'dhw',
    'piping',
  ],
  electrical: ['electrical', 'lighting', 'generator', 'fire alarm'],
  landscaping: ['landscaping', 'gardening', 'irrigation', 'soil', 'mulch'],
  waste: ['waste', 'garbage', 'recycling', 'disposal'],
};

export function normalizeServiceBucket(category: string | null | undefined): string {
  const t = (category ?? '').trim().toLowerCase();
  if (!t) return 'general';
  for (const [bucket, aliases] of Object.entries(BUCKET_ALIASES)) {
    if (aliases.some((alias) => t.includes(alias))) return bucket;
  }
  return 'general';
}
