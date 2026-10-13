import { REDACTED_PLACEHOLDER } from './constants.js';

/** Preserve the original URL while masking password query parameters. */
export default function getApiTraceUrl(url: string): string {
  return url.replace(/([?&])([^=&]+)=([^&]*)/g, (field, separator: string, name: string) => {
    let key = name;
    try {
      key = decodeURIComponent(name.replaceAll('+', ' '));
    } catch {
      // A malformed query key is still safe to inspect as text.
    }
    return /password/i.test(key) ? `${separator}${name}=${REDACTED_PLACEHOLDER}` : field;
  });
}
