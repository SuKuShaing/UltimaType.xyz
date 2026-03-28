import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CountdownOverlay } from './countdown-overlay';

describe('CountdownOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra 3 al montar', () => {
    const onCountdownEnd = vi.fn();
    render(<CountdownOverlay onCountdownEnd={onCountdownEnd} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('avanza a 2 despues de 1 segundo', () => {
    const onCountdownEnd = vi.fn();
    render(<CountdownOverlay onCountdownEnd={onCountdownEnd} />);

    act(() => { vi.advanceTimersByTime(1000); });

    expect(screen.getByText('2')).toBeTruthy();
  });

  it('avanza a 1 despues de 2 segundos', () => {
    const onCountdownEnd = vi.fn();
    render(<CountdownOverlay onCountdownEnd={onCountdownEnd} />);

    act(() => { vi.advanceTimersByTime(2000); });

    expect(screen.getByText('1')).toBeTruthy();
  });

  it('muestra YA despues de 3 segundos', () => {
    const onCountdownEnd = vi.fn();
    render(<CountdownOverlay onCountdownEnd={onCountdownEnd} />);

    act(() => { vi.advanceTimersByTime(3000); });

    expect(screen.getByText('¡YA!')).toBeTruthy();
  });

  it('llama onCountdownEnd despues de mostrar YA brevemente', () => {
    const onCountdownEnd = vi.fn();
    render(<CountdownOverlay onCountdownEnd={onCountdownEnd} />);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(onCountdownEnd).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(400); });
    expect(onCountdownEnd).toHaveBeenCalledTimes(1);
  });

  it('limpia el interval al desmontar', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const onCountdownEnd = vi.fn();
    const { unmount } = render(<CountdownOverlay onCountdownEnd={onCountdownEnd} />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
