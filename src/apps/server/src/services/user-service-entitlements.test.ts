import { describe, expect, it } from 'vitest';
import { dayFromString } from '@habsum/types/common/day';
import { ProductEntitlement } from '@habsum/types/common/entitlement';
import { UserHabitRepository } from '../repositories/user-habit-repository.js';
import { UserAndAuthRepository } from '../repositories/user-and-auth-repository.js';
import { UserService } from './user-service.js';
import { ConfigService } from './config-service.js';

const configService = new ConfigService();
const userAndAuthRepository = new UserAndAuthRepository();
const userService = new UserService();

describe('UserService.entitlementsForUser', () => {
  it('grants ADMIN only to administrator accounts', () => {
    const regular = 'entitlements-regular-account';
    const admin = 'entitlements-admin-account';
    userAndAuthRepository.setUserPassword(regular, 'test-password');
    userAndAuthRepository.createInitialAdminUser(admin, 'test-password');

    expect(userService.entitlementsForUser(regular)).toEqual([ProductEntitlement.NEW_USER]);
    expect(userService.entitlementsForUser(admin)).toEqual([
      ProductEntitlement.NEW_USER,
      ProductEntitlement.ADMIN,
    ]);
  });

  it('grants DEMO_USER only while the persisted demo flag is enabled', () => {
    const username = 'entitlements-demo-user-test';
    userAndAuthRepository.setUserPassword(username, 'test-password');
    expect(userService.entitlementsForUser(username)).not.toContain(ProductEntitlement.DEMO_USER);

    userAndAuthRepository.setUserDemo(username, true);
    expect(userService.entitlementsForUser(username)).toContain(ProductEntitlement.DEMO_USER);

    userAndAuthRepository.setUserDemo(username, false);
    expect(userService.entitlementsForUser(username)).not.toContain(ProductEntitlement.DEMO_USER);
  });

  it('grants NEW_USER when the account has no habit events', () => {
    const username = 'entitlements-new-user-test';
    userAndAuthRepository.setUserPassword(username, 'test-password');

    expect(userService.entitlementsForUser(username)).toContain(ProductEntitlement.NEW_USER);
  });

  it('omits NEW_USER after a daily selection is stored', () => {
    const username = 'entitlements-returning-user-test';
    configService.createEmptyUserConfig(username);
    const habitRepository = new UserHabitRepository(username, configService);
    userAndAuthRepository.setUserPassword(username, 'test-password');
    habitRepository.applyHabitMutation({
      kind: 'set_select',
      habit: 'test-habit',
      date: dayFromString('2020-01-01'),
      value: 'yes',
    });

    expect(userService.entitlementsForUser(username)).not.toContain(ProductEntitlement.NEW_USER);
  });

  it('omits NEW_USER after a text entry is stored', () => {
    const username = 'entitlements-text-user-test';
    configService.createEmptyUserConfig(username);
    const habitRepository = new UserHabitRepository(username, configService);
    userAndAuthRepository.setUserPassword(username, 'test-password');
    habitRepository.applyHabitMutation({
      kind: 'set_text',
      habit: 'journal',
      date: dayFromString('2020-01-01'),
      text: 'A thought.',
    });

    expect(userService.entitlementsForUser(username)).not.toContain(ProductEntitlement.NEW_USER);
  });
});
