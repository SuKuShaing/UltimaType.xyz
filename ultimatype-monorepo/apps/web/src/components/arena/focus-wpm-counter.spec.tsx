import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { FocusWPMCounter } from './focus-wpm-counter';
import { arenaStore } from '../../hooks/use-arena-store';

describe('FocusWPMCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    arenaStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra 0 PPM y 0% error al montar', () => {
    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const wpmEl = container.querySelector('[data-wpm]') as HTMLElement;
    const errorEl = container.querySelector('[data-error]') as HTMLElement;
    expect(wpmEl?.textContent).toBe('0');
    expect(errorEl?.textContent).toBe('0%');
  });

  it('tiene opacidad 1 cuando matchStatus es countdown', () => {
    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.style.opacity).toBe('1');
  });

  it('tiene opacidad reducida cuando matchStatus es playing', () => {
    const { container } = render(<FocusWPMCounter matchStatus="playing" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.style.opacity).toBe('0.5');
  });

  it('tiene opacidad 1 cuando matchStatus es finished', () => {
    const { container } = render(<FocusWPMCounter matchStatus="finished" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.style.opacity).toBe('1');
  });

  it('actualiza PPM via setInterval cuando matchStatus es playing', () => {
    // 50 chars / 5 = 10 words, 60s elapsed = 10 PPM
    arenaStore.getState().setMatchStarted();
    arenaStore.setState({ matchStartTime: Date.now() - 60000, localPosition: 50 });

    const { container } = render(<FocusWPMCounter matchStatus="playing" />);
    const wpmEl = container.querySelector('[data-wpm]') as HTMLElement;

    act(() => { vi.advanceTimersByTime(200); });

    expect(wpmEl?.textContent).toBe('10');
  });

  it('calcula porcentaje de error correctamente', () => {
    arenaStore.getState().setMatchStarted();
    arenaStore.setState({
      matchStartTime: Date.now() - 60000,
      localPosition: 50,
      totalKeystrokes: 10,
      errorKeystrokes: 1,
    });

    const { container } = render(<FocusWPMCounter matchStatus="playing" />);
    const errorEl = container.querySelector('[data-error]') as HTMLElement;

    act(() => { vi.advanceTimersByTime(200); });

    // 1/10 = 10% de errores
    expect(errorEl?.textContent).toBe('10%');
  });

  it('muestra 0% de error cuando no hay keystrokes', () => {
    arenaStore.getState().setMatchStarted();
    arenaStore.setState({
      matchStartTime: Date.now() - 60000,
      localPosition: 50,
      totalKeystrokes: 0,
      errorKeystrokes: 0,
    });

    const { container } = render(<FocusWPMCounter matchStatus="playing" />);
    const errorEl = container.querySelector('[data-error]') as HTMLElement;

    act(() => { vi.advanceTimersByTime(200); });

    expect(errorEl?.textContent).toBe('0%');
  });

  it('no actualiza DOM cuando matchStatus no es playing', () => {
    arenaStore.setState({ matchStartTime: Date.now() - 60000, localPosition: 50 });

    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const wpmEl = container.querySelector('[data-wpm]') as HTMLElement;

    act(() => { vi.advanceTimersByTime(200); });

    // PPM should remain 0 since interval doesn't run when not playing
    expect(wpmEl?.textContent).toBe('0');
  });

  it('limpia el interval al desmontar', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(<FocusWPMCounter matchStatus="playing" />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('badge PPM usa rounded-3xl y bg-surface-container-lowest', () => {
    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const badges = container.querySelectorAll('.rounded-3xl');
    expect(badges.length).toBe(2);
    expect(badges[0].classList.contains('bg-surface-container-lowest')).toBe(true);
    expect(badges[1].classList.contains('bg-surface-container-lowest')).toBe(true);
  });

  it('badge PPM tiene label PPM y badge Error tiene label ERROR', () => {
    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const labels = container.querySelectorAll('.uppercase');
    const texts = Array.from(labels).map((l) => l.textContent);
    expect(texts).toContain('PPM');
    expect(texts).toContain('ERROR');
  });
});
