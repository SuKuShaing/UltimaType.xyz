import { Injectable } from '@nestjs/common';
import geoip from 'geoip-lite';

@Injectable()
export class GeoService {
  getCountryCode(ip: string): string | null {
    try {
      const normalizedIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
      const geo = geoip.lookup(normalizedIp);
      return geo?.country ?? null;
    } catch {
      return null;
    }
  }
}
