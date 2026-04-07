import { Injectable } from '@nestjs/common';

@Injectable()
export class GeoService {
  /**
   * Extracts a valid ISO 3166-1 alpha-2 country code from the
   * Cloudflare `CF-IPCountry` header value.
   * Returns null for missing, unknown (XX), or Tor (T1) values.
   */
  getCountryCode(cfIpCountry: string | undefined): string | null {
    if (!cfIpCountry) return null;
    const code = cfIpCountry.toUpperCase();
    if (code === 'XX' || code === 'T1') return null;
    if (!/^[A-Z]{2}$/.test(code)) return null;
    return code;
  }
}
