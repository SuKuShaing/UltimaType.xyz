import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MatchResultsOverlay } from './match-results-overlay';
import { PlayerResult } from '@ultimatype-monorepo/shared';

const mockResults: PlayerResult[] = [
  {
    playerId: 'p1',
    displayName: 'Martín',
    colorIndex: 1,
    rank: 1,
    wpm: 67,
    precision: 95,
    score: 637,
    missingChars: 0,
    finished: true,
    finishedAt: '2026-03-28T00:05:00Z',
  },
  {
    playerId: 'p2',
    displayName: 'Camilo',
    colorIndex: 2,
    rank: 2,
    wpm: 58,
    precision: 94,
    score: 545,
    missingChars: 0,
    finished: true,
    finishedAt: '2026-03-28T00:05:10Z',
  },
  {
    playerId: 'p3',
    displayName: 'Pedro',
    colorIndex: 3,
    rank: 3,
    wpm: 12,
    precision: 80,
    score: 0,
    missingChars: 42,
    finished: false,
    finishedAt: null,
  },
];

describe('MatchResultsOverlay', () => {
  it('renderiza tabla con resultados ordenados por rank', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );

    expect(screen.getByText('Martín')).toBeDefined();
    expect(screen.getByText('Camilo')).toBeDefined();
    expect(screen.getByText('Pedro')).toBeDefined();
  });

  it('muestra WPM masivo del jugador local con estilo text-7xl', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );

    // The massive WPM display uses text-7xl class
    const allWpmElements = screen.getAllByText('58');
    const massiveWpm = allWpmElements.find((el) =>
      el.className.includes('text-7xl'),
    );
    expect(massiveWpm).toBeDefined();
  });

  it('muestra puntuación del jugador local', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );

    expect(screen.getByText('545 pts')).toBeDefined();
  });

  it('muestra columna Faltantes con missingChars para todos los jugadores', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );

    // Column header exists
    expect(screen.getByText('Faltantes')).toBeDefined();
    // DNF player shows 42 missing chars
    expect(screen.getByText('42')).toBeDefined();
  });

  it('muestra caracteres faltantes en stats locales si missingChars > 0', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p3"
        reason="timeout"
        onRematch={vi.fn()}
      />,
    );

    expect(screen.getByText('42 caracteres faltantes')).toBeDefined();
  });

  it('no muestra caracteres faltantes en stats locales si missingChars es 0', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p1"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );

    expect(screen.queryByText(/caracteres faltantes/)).toBeNull();
  });

  it('botón Revancha visible y llama onRematch al hacer click', () => {
    const onRematch = vi.fn();
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={onRematch}
      />,
    );

    const button = screen.getByText('Revancha');
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(onRematch).toHaveBeenCalledTimes(1);
  });

  it('muestra Tiempo agotado cuando reason es timeout', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="timeout"
        onRematch={vi.fn()}
      />,
    );

    expect(screen.getByText('Tiempo agotado')).toBeDefined();
  });

  it('no muestra Tiempo agotado cuando reason es all_finished', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );

    expect(screen.queryByText('Tiempo agotado')).toBeNull();
  });

  it('tiene role dialog y aria-label para accesibilidad', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-label')).toBe(
      'Resultados de la partida',
    );
  });
});
