/** Clears deprecated login markers from builds before server-side sessions. */
export function clearLegacyClientLoginMarkers() {
  for (const name of ['habsum_login_user', 'habsum_user']) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
