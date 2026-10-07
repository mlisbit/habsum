import { describe, expect, it } from 'vitest';
import hasOnlyUsernameCharacters from './has-only-username-characters.js';

describe('hasOnlyUsernameCharacters', () => {
  it('accepts usernames containing only letters and numbers', () => {
    expect(hasOnlyUsernameCharacters('InvitedUser123')).toBe(true);
  });

  it.each(['invited-user', 'invited_user', 'invited user', 'invited.user'])(
    'rejects the special characters in %s',
    (username) => {
      expect(hasOnlyUsernameCharacters(username)).toBe(false);
    },
  );
});
