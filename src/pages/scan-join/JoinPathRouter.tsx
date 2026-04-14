import { useSearchParams } from 'react-router-dom';
import { JoinRequestPage } from '../JoinRequestPage';
import { JoinScanMarketingPage } from './JoinScanMarketingPage';

/**
 * `/join`：带 `?unit=` 时走扫码营销落地页，否则保留原有加入申请页。
 */
export function JoinPathRouter() {
  const [searchParams] = useSearchParams();
  if (searchParams.has('unit')) {
    return <JoinScanMarketingPage />;
  }
  return <JoinRequestPage />;
}
