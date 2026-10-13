import { createHash } from 'node:crypto';
import { REDACTED_PLACEHOLDER } from './constants.js';

/** Keep cookie names and attributes, using matching fingerprints instead of reusable values. */
export default function getApiTraceCookieHeader(
  header: string,
  { isResponseCookie = false }: { isResponseCookie?: boolean } = {},
): string {
  return header
    .split(';')
    .map((segment, index) => {
      const part = segment.trim();
      if (isResponseCookie && index > 0) return part;
      const separator = part.indexOf('=');
      if (separator < 0) return part;
      const name = part.slice(0, separator);
      const value = part.slice(separator + 1);
      if (/password/i.test(name)) return `${name}=${REDACTED_PLACEHOLDER}`;
      if (!value) return `${name}=`;
      const fingerprint = createHash('sha256').update(value).digest('hex').slice(0, 12);
      return `${name}=[sha256:${fingerprint}]`;
    })
    .join('; ');
}
