import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MatchResultsOverlay } from './match-results-overlay';
import { PlayerResult } from '@ultimatype-monorepo/shared';

const mockResults: PlayerResult[] = [
  {
    playerId: 'p1',
    displayName: 'Martín',
    colorIndex: 1,
    countryCode: null,
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
    countryCode: null,
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
    countryCode: null,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza tabla con resultados ordenados por rank', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('Martín')).toBeDefined();
    expect(screen.getByText('Camilo')).toBeDefined();
    expect(screen.getByText('Pedro')).toBeDefined();
  });

  it('muestra stats del jugador local con labels hero', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('VELOCIDAD DE ESCRITURA')).toBeDefined();
    expect(screen.getByText('PRECISIÓN')).toBeDefined();
    expect(screen.getByText('PUNTAJE TOTAL')).toBeDefined();
  });

  it('muestra puntaje del jugador local en hero stat', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText('PUNTAJE TOTAL')).toBeDefined();
    // El valor 545 aparece tanto en el hero card como en la tabla
    expect(screen.getAllByText('545').length).toBeGreaterThan(0);
  });

  it('NO muestra columna Faltantes en la tabla de resultados', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText('Faltantes')).toBeNull();
  });

  it('botón Revancha visible para host después del countdown y llama onRematch', () => {
    vi.useFakeTimers();
    const onRematch = vi.fn();
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        isHost={true}
        onRematch={onRematch}
        onExit={vi.fn()}
      />,
    );

    // Initially shows countdown
    expect(screen.getByText('Revancha (5s)')).toBeDefined();

    // Advance past 5s delay
    act(() => { vi.advanceTimersByTime(5000); });

    const button = screen.getByText('Revancha');
    expect(button).toBeDefined();
    fireEvent.click(button);
    expect(onRematch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('no-host ve "Esperando revancha del host..." en lugar de Revancha', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        isHost={false}
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText('Revancha')).toBeNull();
    expect(screen.getByText('Esperando revancha del host...')).toBeDefined();
  });

  it('muestra Tiempo agotado cuando reason es timeout', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="timeout"
        onRematch={vi.fn()}
        onExit={vi.fn()}
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
        onExit={vi.fn()}
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
        onExit={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-label')).toBe(
      'Resultados de la partida',
    );
  });

  it('muestra botón "Unirse a la partida" cuando onJoinAsPlayer está definido (espectador)', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="spectator-1"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
        onJoinAsPlayer={vi.fn()}
      />,
    );
    expect(screen.getByText('Unirse a la partida')).toBeDefined();
  });

  it('NO muestra botón "Unirse a la partida" cuando onJoinAsPlayer no está definido (jugador)', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p1"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.queryByText('Unirse a la partida')).toBeNull();
  });

  it('NO muestra Revancha para espectadores (onJoinAsPlayer definido)', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="spectator-1"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
        onJoinAsPlayer={vi.fn()}
      />,
    );
    expect(screen.queryByText('Revancha')).toBeNull();
  });

  it('al hacer click en "Unirse", llama onJoinAsPlayer y muestra confirmación "Inscrito"', () => {
    const onJoinAsPlayer = vi.fn();
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="spectator-1"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
        onJoinAsPlayer={onJoinAsPlayer}
      />,
    );
    fireEvent.click(screen.getByText('Unirse a la partida'));
    expect(onJoinAsPlayer).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Unirse a la partida')).toBeNull();
    expect(screen.getByText(/Inscrito para la siguiente/)).toBeDefined();
  });

  it('muestra Revancha para host (onJoinAsPlayer no definido)', () => {
    vi.useFakeTimers();
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p1"
        reason="all_finished"
        isHost={true}
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('Revancha')).toBeDefined();
    vi.useRealTimers();
  });

  it('contenedor usa rounded-card y glassmorphism bg-surface-base/60', () => {
    const { container } = render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p1"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    const card = container.querySelector('.rounded-card') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.classList.contains('backdrop-blur-glass')).toBe(true);
  });

  it('botón Salir usa rounded-full', () => {
    const { container } = render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p1"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    const exitBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Salir',
    ) as HTMLButtonElement;
    expect(exitBtn).toBeTruthy();
    expect(exitBtn.classList.contains('rounded-full')).toBe(true);
  });

  // ── Nuevos tests Story 5-11 ────────────────────────────────────────

  it('muestra headline "¡Prueba Finalizada!"', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('¡Prueba Finalizada!')).toBeDefined();
  });

  it('muestra heading "Posición respecto a los competidores"', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('Posición respecto a los competidores')).toBeDefined();
  });

  it('fila del jugador local tiene clase bg-primary/10', () => {
    const { container } = render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    const localRow = Array.from(container.querySelectorAll('tr')).find(
      (tr) => tr.className.includes('bg-primary'),
    );
    expect(localRow).toBeTruthy();
  });

  it('botón Compartir visible cuando existe localResult', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="p2"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
      />,
    );
    expect(screen.getByText('Compartir')).toBeDefined();
  });

  it('NO muestra botón Compartir para espectador sin resultado propio', () => {
    render(
      <MatchResultsOverlay
        results={mockResults}
        localUserId="spectator-99"
        reason="all_finished"
        onRematch={vi.fn()}
        onExit={vi.fn()}
        onJoinAsPlayer={vi.fn()}
      />,
    );
    expect(screen.queryByText('Compartir')).toBeNull();
  });
});
