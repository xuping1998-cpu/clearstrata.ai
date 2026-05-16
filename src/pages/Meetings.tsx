import { Navigate } from 'react-router-dom';
import { MeetingListView } from '../features/meetings/MeetingListView';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { canManagePropertyMeetings } from '@/lib/meetingPermissions';

export function Meetings() {
  const { user } = useAuth();
  const { roleInProperty, ready: propertyReady } = useProperty();

  if (user && propertyReady && !canManagePropertyMeetings(roleInProperty)) {
    return <Navigate to="/voting" replace />;
  }

  return <MeetingListView variant="meetings" />;
}

export default Meetings;
