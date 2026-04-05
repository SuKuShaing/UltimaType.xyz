import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isBot } from './og-proxy.middleware';

describe('OG Proxy Middleware', () => {
  describe('isBot', () => {
    it('should detect WhatsApp bot', () => {
      expect(isBot('WhatsApp/2.21.24.19')).toBe(true);
    });

    it('should detect Twitterbot', () => {
      expect(isBot('Twitterbot/1.0')).toBe(true);
    });

    it('should detect facebookexternalhit', () => {
      expect(isBot('facebookexternalhit/1.1')).toBe(true);
    });

    it('should detect Googlebot', () => {
      expect(isBot('Googlebot/2.1')).toBe(true);
    });

    it('should detect LinkedInBot', () => {
      expect(isBot('LinkedInBot/1.0')).toBe(true);
    });

    it('should detect Slackbot', () => {
      expect(isBot('Slackbot-LinkExpanding 1.0')).toBe(true);
    });

    it('should detect Discordbot', () => {
      expect(isBot('Discordbot/2.0')).toBe(true);
    });

    it('should NOT detect normal Chrome browser', () => {
      expect(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')).toBe(false);
    });

    it('should NOT detect empty user agent', () => {
      expect(isBot('')).toBe(false);
    });
  });
});
