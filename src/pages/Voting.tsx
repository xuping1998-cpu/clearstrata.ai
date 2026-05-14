import { MeetingListView } from '../features/meetings/MeetingListView';

/** `/voting` — copy for variant `voting` lives in `LanguageContext` (`nav_owner_initiated_sgm`, `voting_owner_sgm_page_subtitle`) + `MeetingListView`. */
export function Voting() {
  return <MeetingListView variant="voting" />;
}
