import { Navigate, useParams } from 'react-router-dom';

/** 兼容旧链接 /manager-tasks/:taskId → 统一任务详情页 */
export function ManagerTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  if (!taskId) return <Navigate to="/manager-tasks" replace />;
  return <Navigate to={`/property-admin/tasks/${taskId}`} replace />;
}
