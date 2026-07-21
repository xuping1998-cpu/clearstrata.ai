import type { CommunityResolutionRow } from '@/lib/community/communityResolutionModel';
import type { GovernanceMatterRow } from '@/lib/community/governanceMatterModel';
import type { MeetingType } from '@/features/meetings/api';
import type { MeetingInitiationType } from '@/features/meetings/meetingFormatModel';
import type { MeetingEditorDraftPrefill } from '@/lib/meetings/meetingEditorPrefill';

/** Preserved from CouncilWorkspacePage pre-GW-002 behavior; callers pass explicitly. */
export const GOVERNANCE_MEETING_NAVIGATION_DEFAULTS = {
  meetingType: 'sgm' as MeetingType,
  initiationType: 'council_initiated' as MeetingInitiationType,
};

export interface GovernanceMeetingNavigationInput {
  matter: GovernanceMatterRow;
  resolution: CommunityResolutionRow;
  meetingType: MeetingType;
  initiationType: MeetingInitiationType;
}

function normalizeId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveGovernanceLinkedMeetingId(input: {
  matter: GovernanceMatterRow;
  resolution: CommunityResolutionRow;
}): string | null {
  return normalizeId(input.matter.meeting_id) ?? normalizeId(input.resolution.meeting_id);
}

export function canShowScheduleGovernanceMeeting(input: {
  canCouncil: boolean;
  matter: GovernanceMatterRow | null;
  resolution: CommunityResolutionRow | null;
  activePropertyId: string | null;
}): boolean {
  const { canCouncil, matter, resolution, activePropertyId } = input;
  const propertyId = activePropertyId?.trim();
  if (!canCouncil || !matter || !resolution || !propertyId) return false;
  if (!matter.id.trim() || !resolution.id.trim()) return false;
  if (normalizeId(resolution.governance_matter_id) !== matter.id) return false;
  if (matter.property_id !== propertyId) return false;
  if (resolution.property_id !== propertyId) return false;
  if (matter.property_id !== resolution.property_id) return false;
  if (resolveGovernanceLinkedMeetingId({ matter, resolution })) return false;
  return true;
}

export function buildGovernanceMeetingDraftPrefill(
  input: GovernanceMeetingNavigationInput,
): MeetingEditorDraftPrefill {
  const { matter, resolution, meetingType, initiationType } = input;
  const descriptionEn = resolution.executive_summary ?? matter.description ?? '';
  const descriptionZh = descriptionEn;
  const agendaDescriptionEn = resolution.executive_summary ?? '';
  const agendaDescriptionZh = agendaDescriptionEn;

  return {
    source: 'governance_resolution',
    meeting_type: meetingType,
    initiation_type: initiationType,
    title_en: resolution.title,
    title_zh: resolution.title,
    description_en: descriptionEn,
    description_zh: descriptionZh,
    governance_matter_id: matter.id,
    community_resolution_id: resolution.id,
    agenda_items: [
      {
        title_en: resolution.title,
        title_zh: resolution.title,
        kind: 'resolution',
        vote_rule: 'simple_majority',
        description_en: agendaDescriptionEn,
        description_zh: agendaDescriptionZh,
      },
    ],
  };
}

export function buildGovernanceMeetingEditorNavigation(input: GovernanceMeetingNavigationInput): {
  pathname: '/meetings/new';
  state: {
    meetingDraftPrefill: MeetingEditorDraftPrefill;
  };
} {
  return {
    pathname: '/meetings/new',
    state: {
      meetingDraftPrefill: buildGovernanceMeetingDraftPrefill(input),
    },
  };
}
