const COOKIE_NAME = 'habsum_user';

export function getSelectedUser(): string | null {
  const match = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.slice(`${COOKIE_NAME}=`.length);
  return value ? decodeURIComponent(value) : null;
}

export function setSelectedUser(user: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    user,
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function clearSelectedUser() {
  document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
