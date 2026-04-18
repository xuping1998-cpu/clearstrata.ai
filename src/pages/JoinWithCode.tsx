import { useSearchParams } from 'react-router-dom';
import { JoinInvitePage } from './JoinInvite';
import { InviteAutoLogin } from './InviteAutoLogin';

/** Staff invite (`/invite?code=`) or meeting magic link (`/invite?token=`). */
export default function JoinWithCode() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();
  if (token) {
    return <InviteAutoLogin />;
  }
  return <JoinInvitePage />;
}
