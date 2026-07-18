import { fetchGovernanceMatterById } from '@/features/governance-matters/governanceMattersApi';
import type { GovernanceMatterRow } from '@/lib/community/governanceMatterModel';
import type { CommunityResolutionRow } from '@/lib/community/communityResolutionModel';
import { fetchCommunityResolutionById } from '@/features/community-resolutions/communityResolutionsApi';

export interface CommunityResolutionGovernanceBundle {
  resolution: CommunityResolutionRow;
  matter: GovernanceMatterRow | null;
  matterLoadError: string | null;
}

export async function loadCommunityResolutionGovernanceBundle(input: {
  propertyId: string;
  resolutionId: string;
}): Promise<CommunityResolutionGovernanceBundle | null> {
  const propertyId = input.propertyId.trim();
  const resolutionId = input.resolutionId.trim();
  if (!propertyId || !resolutionId) return null;

  const resolution = await fetchCommunityResolutionById(propertyId, resolutionId);
  if (!resolution) return null;

  const matterId = resolution.governance_matter_id?.trim();
  if (!matterId) {
    return { resolution, matter: null, matterLoadError: null };
  }

  try {
    const matter = await fetchGovernanceMatterById(propertyId, matterId);
    if (!matter) {
      return {
        resolution,
        matter: null,
        matterLoadError: 'Governance matter not found',
      };
    }
    return { resolution, matter, matterLoadError: null };
  } catch (e) {
    return {
      resolution,
      matter: null,
      matterLoadError: e instanceof Error ? e.message : 'Failed to load governance matter',
    };
  }
}
