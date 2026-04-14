import { BackButton } from '../../components/BackButton';
import { JoinRequestsReviewPanel } from '../../features/join-requests/JoinRequestsReviewPanel';

export default function AdminJoinRequests() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <BackButton />
      <div className="mt-2">
        <JoinRequestsReviewPanel embedded={false} />
      </div>
    </div>
  );
}
