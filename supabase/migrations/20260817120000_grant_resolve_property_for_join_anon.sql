/*
  允许匿名调用 resolve_property_for_join_request，用于 /join/:code 路由在登录前区分
  「真实物业 code」与「邀请码」。函数本身仅返回 allow_public_join_requests=true 的物业，且不泄露敏感列。
*/

BEGIN;

GRANT EXECUTE ON FUNCTION public.resolve_property_for_join_request(text) TO anon;

COMMIT;
