export const approvedAccountOrigin = 'https://qa-marketplace-app-b9mpo.ondigitalocean.app';

export function assertApprovedAccountOrigin(address: string): void {
  const url = new URL(address);
  if (url.origin !== approvedAccountOrigin || url.username || url.password) {
    throw new Error(
      'Account mutations are authorized only on the original QA origin without embedded credentials.',
    );
  }
}

export type SyntheticAccount = {
  email: string;
  password: string;
  targetOrigin: string;
  createdBy: string;
  cleanupStatus: string;
};

export function assertSyntheticAccount(value: unknown): asserts value is SyntheticAccount {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Refusing to use an invalid synthetic-account ledger.');
  }
  const account = value as Record<string, unknown>;
  if (
    account.targetOrigin !== approvedAccountOrigin ||
    account.createdBy !== 'cas-synthetic-qa' ||
    typeof account.email !== 'string' ||
    !/^cas-qa-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}@example\.com$/.test(account.email) ||
    typeof account.password !== 'string' ||
    account.password.trim().length === 0 ||
    typeof account.cleanupStatus !== 'string'
  ) {
    throw new Error(
      'Refusing to mutate an account without a valid owned synthetic-account ledger.',
    );
  }
}

/** Pure safety policy shared by the browser guard and its offline tests. */
export function isAllowedAccountRequest(method: string, address: string): boolean {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  return (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    url.origin === approvedAccountOrigin &&
    !url.username &&
    !url.password &&
    !/order|payment|checkout/i.test(url.pathname) &&
    (/^\/api\/auth\/(register|login|logout)$/.test(url.pathname) ||
      /^\/api\/cart(?:\/.*)?$/.test(url.pathname) ||
      /^\/api\/account(?:\/addresses(?:\/[^/]+)?)?$/.test(url.pathname))
  );
}
