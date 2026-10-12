export default function getInitialWebSignupStatus(
  hasUsers: boolean,
  { initialWebSignup = process.env.HABSUM_INITIAL_WEB_SIGNUP }: { initialWebSignup?: string } = {},
) {
  const variableEnabled = initialWebSignup === 'true';
  const enabled = !hasUsers && variableEnabled;
  const databaseState = hasUsers ? 'non-empty db' : 'empty db';
  const variableState = variableEnabled ? 'env variable enabled' : 'env variable disabled';

  return {
    enabled,
    message: `WEB SIGNUP FOR INITIAL USER ${enabled ? 'ENABLED' : 'DISABLED'} [${databaseState}, ${variableState}]`,
  };
}
