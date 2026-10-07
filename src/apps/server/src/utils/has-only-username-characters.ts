export default function hasOnlyUsernameCharacters(username: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(username);
}
