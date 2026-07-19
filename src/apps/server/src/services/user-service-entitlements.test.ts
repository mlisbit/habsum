import { describe, expect, it } from 'vitest';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { HabitRepository } from '../repositories/habit-repository.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import { UserService } from './user-service.js';

const habitRepository = new HabitRepository();
const userAndAuthRepository = new UserAndAuthRepository();
const userService = new UserService();

describe('UserService.entitlementsForUser', () => {
  it('grants NEW_USER when the account has no habit events', () => {
    const username = 'entitlements-new-user-test';
    userAndAuthRepository.ensureUserPins([username]);

    expect(userService.entitlementsForUser(username)).toContain(ProductEntitlement.NEW_USER);
  });

  it('omits NEW_USER after a daily selection is stored', () => {
    const username = 'entitlements-returning-user-test';
    userAndAuthRepository.ensureUserPins([username]);
    habitRepository.setDailySelect(username, 'test-habit', '2020-01-01', 'yes');

    expect(userService.entitlementsForUser(username)).not.toContain(ProductEntitlement.NEW_USER);
  });
});
