export function userPageTitle(rawUser: string | undefined, suffix?: string): string {
  const user = rawUser ? safeDecodeURIComponent(rawUser) : null;
  return ['Habsum', user, suffix].filter(Boolean).join(' | ');
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
