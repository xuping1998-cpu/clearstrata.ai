import { getAppPublicOrigin } from './appPublicOrigin';

export function publicInviteEntryUrl(params: {
  propertyId: string;
  inviteCode: string;
  lang?: string;
  source?: string;
}): string {
  const rawLang =
    params.lang ??
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('language') || localStorage.getItem('i18nextLng') || 'zh'
      : 'zh');
  const lang = rawLang === 'en' ? 'en' : 'zh';
  const source = params.source ?? 'qr';
  const origin = getAppPublicOrigin();
  const q = new URLSearchParams({
    propertyId: params.propertyId,
    inviteCode: params.inviteCode,
    source,
    lang,
  });
  return `${origin}/entry?${q.toString()}`;
}
