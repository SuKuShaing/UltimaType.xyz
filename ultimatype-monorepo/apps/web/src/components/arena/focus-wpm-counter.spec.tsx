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

  it('muestra 0 WPM y 100% precision al montar', () => {
    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const wpmEl = container.querySelector('[data-wpm]') as HTMLElement;
    const precisionEl = container.querySelector('[data-precision]') as HTMLElement;
    expect(wpmEl?.textContent).toBe('0');
    expect(precisionEl?.textContent).toBe('100%');
  });

  it('tiene opacidad 1 cuando matchStatus es countdown', () => {
    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.style.opacity).toBe('1');
  });

  it('tiene opacidad 0.15 cuando matchStatus es playing', () => {
    const { container } = render(<FocusWPMCounter matchStatus="playing" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.style.opacity).toBe('0.15');
  });

  it('tiene opacidad 1 cuando matchStatus es finished', () => {
    const { container } = render(<FocusWPMCounter matchStatus="finished" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper?.style.opacity).toBe('1');
  });

  it('actualiza WPM via setInterval cuando matchStatus es playing', () => {
    // 50 chars / 5 = 10 words, 60s elapsed = 10 WPM
    arenaStore.getState().setMatchStarted();
    arenaStore.setState({ matchStartTime: Date.now() - 60000, localPosition: 50 });

    const { container } = render(<FocusWPMCounter matchStatus="playing" />);
    const wpmEl = container.querySelector('[data-wpm]') as HTMLElement;

    act(() => { vi.advanceTimersByTime(200); });

    expect(wpmEl?.textContent).toBe('10');
  });

  it('calcula precision correctamente', () => {
    arenaStore.getState().setMatchStarted();
    arenaStore.setState({
      matchStartTime: Date.now() - 60000,
      localPosition: 50,
      totalKeystrokes: 10,
      errorKeystrokes: 1,
    });

    const { container } = render(<FocusWPMCounter matchStatus="playing" />);
    const precisionEl = container.querySelector('[data-precision]') as HTMLElement;

    act(() => { vi.advanceTimersByTime(200); });

    // (10 - 1) / 10 = 90%
    expect(precisionEl?.textContent).toBe('90%');
  });

  it('no actualiza DOM cuando matchStatus no es playing', () => {
    arenaStore.setState({ matchStartTime: Date.now() - 60000, localPosition: 50 });

    const { container } = render(<FocusWPMCounter matchStatus="countdown" />);
    const wpmEl = container.querySelector('[data-wpm]') as HTMLElement;

    act(() => { vi.advanceTimersByTime(200); });

    // WPM should remain 0 since interval doesn't run when not playing
    expect(wpmEl?.textContent).toBe('0');
  });

  it('limpia el interval al desmontar', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(<FocusWPMCounter matchStatus="playing" />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});
