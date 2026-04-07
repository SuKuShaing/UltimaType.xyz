import { describe, it, expect, beforeEach } from 'vitest';
import { GeoService } from './geo.service';

describe('GeoService', () => {
  let service: GeoService;

  beforeEach(() => {
    service = new GeoService();
  });

  it('retorna código de país válido en mayúsculas', () => {
    expect(service.getCountryCode('CL')).toBe('CL');
    expect(service.getCountryCode('cl')).toBe('CL');
    expect(service.getCountryCode('Ar')).toBe('AR');
  });

  it('retorna null cuando el header es undefined', () => {
    expect(service.getCountryCode(undefined)).toBeNull();
  });

  it('retorna null para XX (desconocido de Cloudflare)', () => {
    expect(service.getCountryCode('XX')).toBeNull();
  });

  it('retorna null para T1 (nodo de salida Tor)', () => {
    expect(service.getCountryCode('T1')).toBeNull();
  });

  it('retorna null para valores con formato inválido', () => {
    expect(service.getCountryCode('')).toBeNull();
    expect(service.getCountryCode('ABC')).toBeNull();
    expect(service.getCountryCode('1')).toBeNull();
    expect(service.getCountryCode('A')).toBeNull();
    expect(service.getCountryCode('12')).toBeNull();
  });
});
