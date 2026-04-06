import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Design System Migration tests (Story 5.1)
 * Validates that CSS tokens, typography, radius, and dark mode
 * are correctly defined in styles.css.
 */

const stylesPath = resolve(__dirname, 'styles.css');
const stylesContent = readFileSync(stylesPath, 'utf-8');

const indexHtmlPath = resolve(__dirname, '..', 'index.html');
const indexHtmlContent = readFileSync(indexHtmlPath, 'utf-8');

describe('Design System — Token Extension (AC1)', () => {
  const existingLightTokens = [
    '--color-surface-base',
    '--color-surface-sunken',
    '--color-surface-raised',
    '--color-primary',
    '--color-success',
    '--color-error',
    '--color-text-main',
    '--color-text-muted',
  ];

  const newLightTokens = [
    '--color-surface-container',
    '--color-surface-container-low',
    '--color-surface-container-lowest',
    '--color-on-surface-variant',
    '--color-outline',
    '--color-outline-variant',
    '--color-primary-container',
    '--color-secondary',
    '--color-secondary-container',
  ];

  const themeBlock = stylesContent.match(/@theme\s*\{([\s\S]*?)\}/s);

  it.each(existingLightTokens)('existing token %s is declared in @theme', (token) => {
    expect(themeBlock).toBeTruthy();
    expect(themeBlock![1]).toMatch(new RegExp(`${token}\\s*:`));
  });

  it.each(newLightTokens)('new token %s is declared in @theme', (token) => {
    expect(themeBlock).toBeTruthy();
    expect(themeBlock![1]).toMatch(new RegExp(`${token}\\s*:`));
  });

  const darkTokens = [
    '--color-surface-base: #0F1F29',
    '--color-surface-sunken: #1A2630',
    '--color-surface-raised: #25343F',
    '--color-text-main: #F8F9FA',
    '--color-text-muted: #909EAA',
    '--color-surface-container: #1E2D37',
    '--color-surface-container-low: #162229',
    '--color-surface-container-lowest: #0A1520',
    '--color-on-surface-variant: #A0ACB5',
    '--color-outline: #506070',
    '--color-outline-variant: #C3C7CB1A',
    '--color-primary-container: #25343F',
    '--color-secondary: #FFB77C',
    '--color-secondary-container: #6E3500',
  ];

  it.each(darkTokens)('dark mode override %s is present', (token) => {
    // Extract the .dark { ... } block and verify token is inside it
    const darkBlockMatch = stylesContent.match(/\.dark\s*\{[\s\S]*?\}/s);
    expect(darkBlockMatch).toBeTruthy();
    expect(darkBlockMatch![0]).toContain(token);
  });

  it('does not modify existing Epic 4 light token values', () => {
    // Verify exact existing values are preserved
    expect(stylesContent).toContain('--color-surface-base: #F5FAFA');
    expect(stylesContent).toContain('--color-surface-sunken: #EAEFEF');
    expect(stylesContent).toContain('--color-surface-raised: #FFFFFF');
    expect(stylesContent).toContain('--color-primary: #FF9B51');
    expect(stylesContent).toContain('--color-success: #4ADE80');
    expect(stylesContent).toContain('--color-error: #FB7185');
    expect(stylesContent).toContain('--color-text-main: #0F1F29');
    expect(stylesContent).toContain('--color-text-muted: #64748B');
  });
});

describe('Design System — Typography (AC2)', () => {
  it('defines font-sans as Space Grotesk', () => {
    expect(stylesContent).toMatch(/--font-sans:.*Space Grotesk/);
  });

  it('defines font-mono as IBM Plex Mono', () => {
    expect(stylesContent).toMatch(/--font-mono:.*IBM Plex Mono/);
  });

  it('loads Space Grotesk via Google Fonts in index.html', () => {
    expect(indexHtmlContent).toContain('Space+Grotesk');
    expect(indexHtmlContent).toContain('fonts.googleapis.com');
  });

  it('loads IBM Plex Mono via Google Fonts in index.html', () => {
    expect(indexHtmlContent).toContain('IBM+Plex+Mono');
  });

  it('includes preconnect hints for font performance', () => {
    expect(indexHtmlContent).toContain('rel="preconnect"');
    expect(indexHtmlContent).toContain('fonts.gstatic.com');
  });

  it('defines typography scale tokens', () => {
    expect(stylesContent).toContain('--font-size-display-lg: 3.5rem');
    expect(stylesContent).toContain('--font-size-headline-lg: 2rem');
    expect(stylesContent).toContain('--font-size-title-lg: 1.375rem');
    expect(stylesContent).toContain('--font-size-label-md: 0.75rem');
  });

  it('defines letter-spacing tokens', () => {
    expect(stylesContent).toContain('--tracking-display: -0.02em');
    expect(stylesContent).toContain('--tracking-headline: -0.01em');
    expect(stylesContent).toContain('--tracking-title: 0.02em');
    expect(stylesContent).toContain('--tracking-label: 0.05em');
  });
});

describe('Design System — Border Radius (AC3)', () => {
  it('defines card radius as 2rem', () => {
    expect(stylesContent).toContain('--radius-card: 2rem');
  });

  it('defines large card radius as 2.5rem', () => {
    expect(stylesContent).toContain('--radius-card-lg: 2.5rem');
  });

  it('defines full/pill radius as 9999px', () => {
    expect(stylesContent).toContain('--radius-full: 9999px');
  });
});

describe('Design System — No-Line Rule Documentation (AC4)', () => {
  it('documents the No-Line rule in styles.css', () => {
    expect(stylesContent).toContain('NO-LINE RULE');
    expect(stylesContent).toContain('tonal surface shifts');
  });

  it('documents tinted shadows rule', () => {
    expect(stylesContent).toContain('rgba(15, 31, 41, 0.06)');
    expect(stylesContent).toContain('Never use pure black');
  });

  it('documents surface hierarchy', () => {
    expect(stylesContent).toContain('SURFACE HIERARCHY');
  });
});

describe('Design System — Dark Mode Variant (AC7)', () => {
  it('declares @custom-variant dark for Tailwind v4', () => {
    expect(stylesContent).toContain('@custom-variant dark');
    expect(stylesContent).toContain('.dark');
  });
});

describe('Design System — Token Audit (AC6)', () => {
  it('contains the Epic 4 token audit comment block', () => {
    expect(stylesContent).toContain('EPIC 4 TOKEN AUDIT');
  });

  it('flags No-Line violations in leaderboard-page.tsx', () => {
    expect(stylesContent).toContain('leaderboard-page.tsx');
    expect(stylesContent).toContain('"NO-LINE" VIOLATIONS');
  });

  it('flags No-Line violations in all 4 Epic 4 components', () => {
    expect(stylesContent).toContain('public-profile-page.tsx');
    expect(stylesContent).toContain('match-history-section.tsx');
    expect(stylesContent).toContain('match-detail-page.tsx');
  });
});
