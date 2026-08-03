/** Raw PostgREST row shapes for snapshot domain tables (snake_case). */

export type OwnerVoteMeetingDbRow = {
  id: string;
  property_id: string;
  status: string;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  snapshot_freeze_at: string | null;
  snapshot_frozen_at: string | null;
  scheduled_at: string | null;
  meeting_type: string | null;
  created_at: string;
};

export type FreezeEventDbRow = {
  id: string;
  owner_vote_meeting_id: string;
  property_id: string;
  frozen_at: string;
  is_primary: boolean;
  created_at: string;
};

export type VoterSnapshotDbRow = {
  id: string;
  meeting_id: string;
  property_id: string;
  unit_no: string;
  user_id: string;
  role: string;
  is_eligible: boolean;
  frozen_at: string;
  created_at: string;
  freeze_event_id: string | null;
};

export type ResolutionSnapshotDbRow = {
  id: string;
  freeze_event_id: string;
  owner_vote_meeting_id: string;
  property_id: string;
  frozen_at: string;
  created_at: string;
};

export type FrozenMotionDbRow = {
  id: string;
  resolution_snapshot_id: string;
  freeze_event_id: string;
  owner_vote_meeting_id: string;
  property_id: string;
  display_order: number;
  title: string;
  description: string | null;
  threshold: string;
  vote_method: string | null;
  source_agenda_item_id: string | null;
  source_resolution_id: string | null;
  source_formal_resolution_version: number | null;
  frozen_at: string;
  created_at: string;
};

export const OWNER_VOTE_MEETING_SELECT =
  'id,property_id,status,voting_opens_at,voting_closes_at,snapshot_freeze_at,snapshot_frozen_at,scheduled_at,meeting_type,created_at';

export const FREEZE_EVENT_SELECT =
  'id,owner_vote_meeting_id,property_id,frozen_at,is_primary,created_at';

export const VOTER_SNAPSHOT_SELECT =
  'id,meeting_id,property_id,unit_no,user_id,role,is_eligible,frozen_at,created_at,freeze_event_id';

export const RESOLUTION_SNAPSHOT_SELECT =
  'id,freeze_event_id,owner_vote_meeting_id,property_id,frozen_at,created_at';

export const FROZEN_MOTION_SELECT =
  'id,resolution_snapshot_id,freeze_event_id,owner_vote_meeting_id,property_id,display_order,title,description,threshold,vote_method,source_agenda_item_id,source_resolution_id,source_formal_resolution_version,frozen_at,created_at';
