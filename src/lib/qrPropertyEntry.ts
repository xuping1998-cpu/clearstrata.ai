/**
 * 扫码 /entry 入楼：从 `unifiedPropertyEntry` 导出，保持既有 import 路径。
 */
export {
  tryAutoJoinProperty,
  createPendingJoinRequest,
  type TryAutoJoinPropertyInput,
  type TryAutoJoinPropertySuccess,
  type TryAutoJoinPropertyFailure,
  type TryAutoJoinPropertyResult,
  type CreatePendingJoinRequestInput,
  type CreatePendingJoinRequestResult,
} from './unifiedPropertyEntry';
