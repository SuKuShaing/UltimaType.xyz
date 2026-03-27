import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeoService } from './geo.service';

vi.mock('geoip-lite', () => ({
  default: {
    lookup: vi.fn(),
  },
}));

import geoip from 'geoip-lite';

describe('GeoService', () => {
  let service: GeoService;

  beforeEach(() => {
    service = new GeoService();
    vi.clearAllMocks();
  });

  it('retorna código de país para IP válida', () => {
    vi.mocked(geoip.lookup).mockReturnValue({
      country: 'CL',
      region: '',
      eu: '0',
      timezone: '',
      city: '',
      ll: [-33.45, -70.67],
      metro: 0,
      area: 0,
      range: [0, 0],
    });
    expect(service.getCountryCode('200.1.2.3')).toBe('CL');
    expect(geoip.lookup).toHaveBeenCalledWith('200.1.2.3');
  });

  it('retorna null para IP loopback IPv4', () => {
    vi.mocked(geoip.lookup).mockReturnValue(null);
    expect(service.getCountryCode('127.0.0.1')).toBeNull();
  });

  it('retorna null para IP loopback IPv6', () => {
    vi.mocked(geoip.lookup).mockReturnValue(null);
    expect(service.getCountryCode('::1')).toBeNull();
  });

  it('retorna null para IP desconocida/inválida', () => {
    vi.mocked(geoip.lookup).mockReturnValue(null);
    expect(service.getCountryCode('0.0.0.0')).toBeNull();
  });

  it('normaliza y resuelve IPv6-mapped IPv4 (::ffff:x.x.x.x)', () => {
    vi.mocked(geoip.lookup).mockReturnValue({
      country: 'AR',
      region: '',
      eu: '0',
      timezone: '',
      city: '',
      ll: [-34.6, -58.38],
      metro: 0,
      area: 0,
      range: [0, 0],
    });
    expect(service.getCountryCode('::ffff:200.1.2.3')).toBe('AR');
    expect(geoip.lookup).toHaveBeenCalledWith('200.1.2.3');
  });

  it('retorna null si geoip lanza una excepción', () => {
    vi.mocked(geoip.lookup).mockImplementation(() => {
      throw new Error('geoip error');
    });
    expect(service.getCountryCode('bad-ip')).toBeNull();
  });
});
