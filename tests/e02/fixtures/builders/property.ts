/**
 * Synthetic property builder — no production identifiers.
 */

export type SyntheticProperty = {
  id: string;
  name: string;
  evidenceRunId: string;
};

export function buildSyntheticProperty(evidenceRunId: string, suffix = 'prop'): SyntheticProperty {
  const id = crypto.randomUUID();
  return {
    id,
    name: `e02-synthetic-${evidenceRunId.slice(0, 8)}-${suffix}`,
    evidenceRunId,
  };
}
