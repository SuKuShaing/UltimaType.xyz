import { describe, it, expect } from 'vitest';
import { COUNTRIES, isValidCountryCode } from './countries';

describe('countries', () => {
  describe('COUNTRIES array', () => {
    it('debería contener entradas con code y name', () => {
      expect(COUNTRIES.length).toBeGreaterThan(0);
      expect(COUNTRIES[0]).toHaveProperty('code');
      expect(COUNTRIES[0]).toHaveProperty('name');
    });

    it('todos los códigos deberían ser strings de 2 letras en mayúsculas', () => {
      for (const country of COUNTRIES) {
        expect(country.code).toMatch(/^[A-Z]{2}$/);
      }
    });

    it('debería incluir países comunes', () => {
      const codes = COUNTRIES.map((c) => c.code);
      expect(codes).toContain('AR');
      expect(codes).toContain('CL');
      expect(codes).toContain('US');
      expect(codes).toContain('ES');
      expect(codes).toContain('BR');
    });
  });

  describe('isValidCountryCode', () => {
    it('debería retornar true para un código válido (mayúsculas)', () => {
      expect(isValidCountryCode('CL')).toBe(true);
    });

    it('debería retornar true para un código válido (minúsculas)', () => {
      expect(isValidCountryCode('cl')).toBe(true);
    });

    it('debería retornar true para un código válido (mixto)', () => {
      expect(isValidCountryCode('Cl')).toBe(true);
    });

    it('debería retornar false para un código inválido', () => {
      expect(isValidCountryCode('XX')).toBe(false);
    });

    it('debería retornar false para un string vacío', () => {
      expect(isValidCountryCode('')).toBe(false);
    });

    it('debería retornar false para un código de 3 letras', () => {
      expect(isValidCountryCode('CHL')).toBe(false);
    });

    it('debería validar AR (Argentina) correctamente', () => {
      expect(isValidCountryCode('AR')).toBe(true);
    });

    it('debería validar US (Estados Unidos) correctamente', () => {
      expect(isValidCountryCode('US')).toBe(true);
    });
  });
});
